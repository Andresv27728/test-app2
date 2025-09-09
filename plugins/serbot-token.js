import fs from 'fs'
import path from 'path'

export default {
    name: 'token',
    aliases: ['gettoken', 'serbottoken'],
    category: 'subbots',
    description: 'Obtiene el token de tu sesión de sub-bot.',

    async execute({ sock: conn, msg: m }) {
        const user = m.sender.split('@')[0]
        const jadiBotPath = path.join(process.cwd(), 'blackJadiBot', user, 'creds.json');

        if (fs.existsSync(jadiBotPath)) {
            const token = Buffer.from(fs.readFileSync(jadiBotPath, 'utf-8')).toString('base64')

            await conn.sendMessage(m.key.remoteJid, { text: `🍄 *El token te permite iniciar sesion en otros bots, recomendamos no compartirlo con nadie*\n\nTu token es:` }, { quoted: m });
            await conn.sendMessage(m.key.remoteJid, { text: token }, { quoted: m });
        } else {
            await conn.sendMessage(m.key.remoteJid, { text: `🚩 *No tienes ningun token activo, usa !qr o !code para crear uno*` }, { quoted: m });
        }
    }
}
