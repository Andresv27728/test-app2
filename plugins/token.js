import fs from 'fs'
import path from 'path'

export default {
    name: 'token',
    aliases: ['gettoken'],
    category: 'subbots',
    description: 'Obtiene el token de tu sesión de sub-bot.',

    async execute({ sock: conn, msg: m }) {
        const userJid = m.sender;
        const subBotDir = path.join(process.cwd(), 'sub-bots', userJid.split('@')[0]);
        const credsPath = path.join(subBotDir, 'creds.json');

        if (fs.existsSync(credsPath)) {
            const token = Buffer.from(fs.readFileSync(credsPath, 'utf-8')).toString('base64');
            await conn.sendMessage(userJid, { text: `Tu token de sesión es:\n\n\`\`\`${token}\`\`\`` });
            if (m.key.remoteJid !== userJid) {
                await conn.sendMessage(m.key.remoteJid, { text: "Te he enviado tu token por mensaje privado." }, { quoted: m });
            }
        } else {
            await conn.sendMessage(m.key.remoteJid, { text: "No tienes una sesión de sub-bot activa. Usa el comando `serbot` para crear una." }, { quoted: m });
        }
    }
}
