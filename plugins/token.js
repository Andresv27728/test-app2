import fs from 'fs'
import path from 'path'

export default {
    name: 'token',
    aliases: ['gettoken'],
    category: 'subbots',
    description: 'Obtiene el token de tu sesión de sub-bot.',

    async execute({ sock: conn, msg: m }) {
        const ownerJid = m.sender;
        const subBot = (global.subBots || []).find(bot => bot.owner === ownerJid);

        if (!subBot) {
            return conn.sendMessage(m.key.remoteJid, { text: "No tienes una sesión de sub-bot activa. Usa el comando `code` para crear una." }, { quoted: m });
        }

        const subBotPhoneNumber = subBot.jid.split('@')[0];
        const credsPath = path.join(process.cwd(), 'sub-bots', subBotPhoneNumber, 'creds.json');

        if (fs.existsSync(credsPath)) {
            const token = Buffer.from(fs.readFileSync(credsPath, 'utf-8')).toString('base64');
            const message = `
*Token de Sesión para Sub-Bot*

Este es tu token de sesión para el número *${subBotPhoneNumber}*.
Guárdalo en un lugar seguro. No lo compartas con nadie.

Puedes usar este token para conectar tu sub-bot en otra instancia o si el bot principal se reinicia.

*Tu Token:*
\`\`\`${token}\`\`\`
            `;
            try {
                await conn.sendMessage(ownerJid, { text: message.trim() });
                if (m.key.remoteJid !== ownerJid) {
                    await conn.sendMessage(m.key.remoteJid, { text: "Te he enviado tu token por mensaje privado." }, { quoted: m });
                }
            } catch (e) {
                console.error("Failed to send token to user privately:", e);
                await conn.sendMessage(m.key.remoteJid, { text: "No pude enviarte el token por privado. Asegúrate de haber iniciado una conversación conmigo." }, { quoted: m });
            }
        } else {
            await conn.sendMessage(m.key.remoteJid, { text: "No se encontró el archivo de credenciales para tu sesión de sub-bot." }, { quoted: m });
        }
    }
}
