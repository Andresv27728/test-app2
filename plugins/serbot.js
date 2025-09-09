import Baileys, { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, Browsers } from "@whiskeysockets/baileys"
import qrcode from "qrcode"
import fs from "fs"
import path from "path"
import pino from 'pino'
import chalk from 'chalk'
import { handler } from '../handler.js'
import config from '../config.js';

if (!global.subBots) global.subBots = [];
const cooldowns = new Map();

function msToTime(duration) {
  var seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60)
  minutes = (minutes < 10) ? '0' + minutes : minutes
  seconds = (seconds < 10) ? '0' + seconds : seconds
  return minutes + ' m y ' + seconds + ' s '
}

export default {
    name: 'serbot',
    aliases: ['qr', 'code'],
    category: 'subbots',
    description: 'Conviértete en un sub-bot.',

    async execute({ sock: conn, msg: m, args }) {
        const userJid = m.sender;
        const cooldownTime = 120000; // 2 minutes

        if (cooldowns.has(userJid)) {
            const lastTime = cooldowns.get(userJid);
            const timeDiff = Date.now() - lastTime;
            if (timeDiff < cooldownTime) {
                const timeLeft = cooldownTime - timeDiff;
                return conn.sendMessage(m.key.remoteJid, { text: `⏳ Debes esperar ${msToTime(timeLeft)} para volver a ser un Sub-Bot.` }, { quoted: m });
            }
        }

        const command = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim().split(/ +/)[0].toLowerCase().slice(config.prefix.length);
        const isCode = command === 'code' || args.includes('--code');

        const subBotDir = path.join(process.cwd(), 'sub-bots', userJid.split('@')[0]);
        if (fs.existsSync(subBotDir)) {
            // Allow re-connecting by removing old session
            fs.rmSync(subBotDir, { recursive: true, force: true });
        }
        fs.mkdirSync(subBotDir, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(subBotDir);
        const { version } = await fetchLatestBaileysVersion();

        const connectionOptions = {
            logger: pino({ level: "fatal" }),
            printQRInTerminal: false,
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
            browser: isCode ? Browsers.macOS("Chrome") : Browsers.macOS("Desktop"),
            version: version,
            generateHighQualityLinkPreview: true
        };

        const subBotSocket = Baileys.default(connectionOptions);

        subBotSocket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr && !isCode) {
                const qrImage = await qrcode.toBuffer(qr, { scale: 8 });
                await conn.sendMessage(m.key.remoteJid, { image: qrImage, caption: "Escanea este QR para convertirte en un sub-bot." }, { quoted: m });
            }

            if (qr && isCode) {
                try {
                    let phoneNumber = userJid.split('@')[0];
                    if (!phoneNumber) {
                        await conn.sendMessage(m.key.remoteJid, { text: `No se pudo obtener tu número de teléfono para el código de emparejamiento.` }, { quoted: m });
                        return;
                    }
                    await conn.sendMessage(m.key.remoteJid, { text: `Generando código para +${phoneNumber}...` }, { quoted: m });
                    let secret = await subBotSocket.requestPairingCode(phoneNumber);
                    secret = secret.match(/.{1,4}/g)?.join("-");
                    await conn.sendMessage(m.key.remoteJid, { text: `Tu código de emparejamiento es: *${secret}*` }, { quoted: m });
                } catch (e) {
                    console.error(e);
                    await conn.sendMessage(m.key.remoteJid, { text: `Error al generar el código. Intenta con el QR.` }, { quoted: m });
                }
            }

            if (connection === 'open') {
                cooldowns.set(userJid, Date.now());
                const existingBotIndex = global.subBots.findIndex(bot => bot.jid === subBotSocket.user.id);
                if (existingBotIndex > -1) {
                    global.subBots.splice(existingBotIndex, 1);
                }
                global.subBots.push({ jid: subBotSocket.user.id, sock: subBotSocket, owner: userJid });
                await conn.sendMessage(m.key.remoteJid, { text: `¡Felicidades! Ahora eres un sub-bot.` }, { quoted: m });
            }

            if (connection === 'close') {
                const index = global.subBots.findIndex(bot => bot.jid === subBotSocket.user?.id);
                if (index > -1) {
                    global.subBots.splice(index, 1);
                }

                const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                if (!shouldReconnect) {
                    fs.rmdirSync(subBotDir, { recursive: true, force: true });
                    await conn.sendMessage(m.key.remoteJid, { text: `Conexión de sub-bot cerrada permanentemente.` }, { quoted: m });
                } else {
                    // It will try to reconnect automatically
                }
            }
        });

        subBotSocket.ev.on('creds.update', saveCreds);
        subBotSocket.ev.on('messages.upsert', (upsert) => {
            handler.call(subBotSocket, upsert, true);
        });
    }
}
