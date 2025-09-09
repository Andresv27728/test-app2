export default {
    name: 'bots',
    aliases: ['listbots', 'subbots'],
    category: 'subbots',
    description: 'Lista los sub-bots conectados.',

    async execute({ sock: conn, msg: m }) {
        const subBots = global.subBots || [];

        if (subBots.length === 0) {
            return conn.sendMessage(m.key.remoteJid, { text: "No hay sub-bots conectados." }, { quoted: m });
        }

        let response = `*Sub-Bots Conectados:*\n\n`;
        subBots.forEach((bot, index) => {
            const botUser = bot.sock.user;
            if (botUser) {
                const name = botUser.name || 'Sin Nombre';
                const jid = botUser.id;
                response += `${index + 1}. *Nombre:* ${name}\n   *JID:* ${jid}\n   *Owner:* @${bot.owner.split('@')[0]}\n\n`;
            }
        });

        const mentions = subBots.map(bot => bot.owner);
        await conn.sendMessage(m.key.remoteJid, { text: response.trim(), mentions }, { quoted: m });
    }
}
