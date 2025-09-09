import ws from 'ws'
import { format } from 'util'

let handler = async (m, { conn }) => {
  let uniqueUsers = new Map()
  if (!global.conns || !Array.isArray(global.conns)) {
    global.conns = []
  }

  global.conns.forEach((conn) => {
    if (conn.user && conn.ws?.socket?.readyState !== ws.CLOSED) {
      uniqueUsers.set(conn.user.jid, conn.user.name)
    }
  })

  let uptime = process.uptime() * 1000
  let formatUptime = clockString(uptime)
  let totalUsers = uniqueUsers.size

  let txt = `
╭───────────────༺☆༻───────────────╮
🌊🐚 *Gawr Gura's Submarine Control Panel* 🐚🌊
╰───────────────༺☆༻───────────────╯

╭─❍ 𓆩💠𓆪 ✦ *Bot Principal:*
│        ʚɞ  Gawr Gura ოძ 𝘽 ꂦ Ꮏ
╰───────────────────────────────╯

➺ 🕐 *Tiempo Activa:* ${formatUptime}
➺ 🤖 *Subs Conectados:* ${totalUsers || 0} sharks

${totalUsers > 0 ? `
✧⋆｡˚ Lista de subs nadando conmigo 🦈:
${Array.from(uniqueUsers).map(([jid, name], i) =>
`   🫧 ${i + 1}. ${name}  ➜  wa.me/${jid.split('@')[0]}`).join('\n')}
` : `
⋆｡˚☁︎ Ningún submarino conectado por ahora~
       ¿Dónde están mis babiesharksss? 🥺`}

╭───────────────༺✧༻───────────────╮
🐟 ᵗʰᵃⁿᵏ ʸᵒᵘ ᶠᵒʳ ʳᵘⁿⁿⁱⁿᵍ ᵗʰᵉ ᵒᶜᵉᵃⁿ ᵇᵒᵗ 🌊
╰───────────────༺✧༻───────────────╯
`.trim()

  await conn.reply(m.chat, txt, m, rcanal)
}

handler.command = ['listjadibot', 'bots']
handler.help = ['bots']
handler.tags = ['serbot']
export default handler

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor((ms % 3600000) / 60000)
  let s = Math.floor((ms % 60000) / 1000)
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}
