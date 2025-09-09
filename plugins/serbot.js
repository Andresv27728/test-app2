import Baileys, { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, Browsers } from "@whiskeysockets/baileys"
import fs from "fs"
import path from "path"
import pino from 'pino'
import { handler as mainHandler } from '../handler.js'
import config from '../config.js';

if (!global.subBots) global.subBots = [];
const failureCooldowns = new Map();

function msToTime(duration) {
  var seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60)
  minutes = (minutes < 10) ? '0' + minutes : minutes
  seconds = (seconds < 10) ? '0' + seconds : seconds
  return minutes + ' m y ' + seconds + ' s '
}

export default {
    name: 'code',
    aliases: ['serbot'],
    category: 'subbots',
    description: 'Conviértete en un sub-bot mediante un código de emparejamiento.',

    async execute({ sock: conn, msg: m, args }) {
        const userJid = m.sender;
        if (failureCooldowns.has(userJid)) {
            const lastTime = failureCooldowns.get(userJid);
            const timeDiff = Date.now() - lastTime;
            if (timeDiff < 60000) { // 1 minute
                const timeLeft = 60000 - timeDiff;
                return conn.sendMessage(m.key.remoteJid, { text: `Debes esperar ${msToTime(timeLeft)} para solicitar un nuevo código.` }, { quoted: m });
            }
        }

        const phoneNumber = args[0];
        if (!phoneNumber || !/^\d+$/.test(phoneNumber)) {
            return conn.sendMessage(m.key.remoteJid, { text: "Por favor, proporciona un número de teléfono válido sin el signo '+'\n\nEjemplo: .code 549..." }, { quoted: m });
        }

        const subBotDir = path.join(process.cwd(), 'sub-bots', phoneNumber);

        const start = async () => {
            if (fs.existsSync(subBotDir)) {
                fs.rmSync(subBotDir, { recursive: true, force: true });
            }
            fs.mkdirSync(subBotDir, { recursive: true });

            const { state, saveCreds } = await useMultiFileAuthState(subBotDir);
            const { version } = await fetchLatestBaileysVersion();

            const connectionOptions = {
                logger: pino({ level: "fatal" }),
                printQRInTerminal: false,
                auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
                browser: Browsers.macOS("Chrome"),
                version: version,
                generateHighQualityLinkPreview: true
            };

            const subBotSocket = Baileys.default(connectionOptions);

            let pairingCodeRequested = false;
            subBotSocket.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;

                if(connection === 'connecting' && !pairingCodeRequested) {
                    await conn.sendMessage(m.key.remoteJid, { text: `Generando código para +${phoneNumber}...` }, { quoted: m });
                    try {
                        const secret = await subBotSocket.requestPairingCode(phoneNumber);
                        await conn.sendMessage(m.key.remoteJid, { text: `Tu código de emparejamiento es: *${secret.match(/.{1,4}/g).join('-')}*` }, { quoted: m });
                        pairingCodeRequested = true;

                        setTimeout(() => {
                            if (!subBotSocket.user?.id) {
                                failureCooldowns.set(userJid, Date.now());
                                conn.sendMessage(m.key.remoteJid, { text: "El tiempo para conectar el sub-bot ha expirado." }, { quoted: m });
                                subBotSocket.ws.close();
                                if (fs.existsSync(subBotDir)) {
                                    fs.rmSync(subBotDir, { recursive: true, force: true });
                                }
                            }
                        }, 40000);

                    } catch (e) {
                        console.error("Error requesting pairing code:", e);
                        await conn.sendMessage(m.key.remoteJid, { text: `Error al generar el código. Asegúrate de que el número de teléfono es correcto y tiene WhatsApp.` }, { quoted: m });
                        if (fs.existsSync(subBotDir)) {
                            fs.rmSync(subBotDir, { recursive: true, force: true });
                        }
                    }
                }

                if (connection === 'open') {
                    const existingBotIndex = global.subBots.findIndex(bot => bot.jid === subBotSocket.user.id);
                    if (existingBotIndex > -1) {
                        global.subBots.splice(existingBotIndex, 1);
                    }
                    global.subBots.push({ jid: subBotSocket.user.id, sock: subBotSocket, owner: m.sender });
                    await conn.sendMessage(m.key.remoteJid, { text: `Sub-bot conectado exitosamente para el número ${subBotSocket.user.id}.` }, { quoted: m });
                }

                if (connection === 'close') {
                    const index = global.subBots.findIndex(bot => bot.jid === subBotSocket.user?.id);
                    if (index > -1) {
                        global.subBots.splice(index, 1);
                    }
                    if ((lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
                        // It will try to reconnect automatically
                    } else {
                        if (fs.existsSync(subBotDir)) {
                            fs.rmSync(subBotDir, { recursive: true, force: true });
                        }
                        await conn.sendMessage(m.key.remoteJid, { text: `Conexión de sub-bot cerrada permanentemente.` }, { quoted: m });
                    }
                }
            });

            subBotSocket.ev.on('creds.update', saveCreds);
            subBotSocket.ev.on('messages.upsert', (upsert) => {
                mainHandler.call(subBotSocket, upsert, true);
            });
        }

        await start().catch(async (e) => {
            console.error(e);
            if (fs.existsSync(subBotDir)) {
                fs.rmSync(subBotDir, { recursive: true, force: true });
            }
            await conn.sendMessage(m.key.remoteJid, { text: `Error al crear el sub-bot. Inténtalo de nuevo.` }, { quoted: m });
        });
    }
}
