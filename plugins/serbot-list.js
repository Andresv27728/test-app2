import config from '../config.js';

export default {
    name: 'bots',
    aliases: ['listjadibot'],
    category: 'subbots',
    description: 'Lista los sub-bots conectados.',

    async execute({ sock: conn, msg: m }) {
        const maxSubBots = 500;
        const conns = Array.isArray(global.conns) ? global.conns : [];

        const isConnOpen = (c) => {
            try {
                return c?.ws?.socket?.readyState === 1;
            } catch {
                return !!c?.user?.id;
            }
        };

        const unique = new Map();
        for (const c of conns) {
            if (!c || !c.user) continue;
            if (!isConnOpen(c)) continue;

            const jidRaw = c.user.jid || c.user.id || '';
            if (!jidRaw) continue;

            unique.set(jidRaw, c);
        }

        const users = [...unique.values()];
        const totalUsers = users.length;
        const availableSlots = Math.max(0, maxSubBots - totalUsers);

        const packname = '🤖 𝙱𝙾𝗧';
        const title = `⭑『 𝗦𝗨𝗕𝗕𝗢𝗧𝗦 𝗖𝗢𝗡𝗘𝗖𝗧𝗔𝗗𝗢𝗦 』⭑`;
        const barra = '━━━━━━━━━━━━━━━━';

        let responseMessage = '';

        if (totalUsers === 0) {
            responseMessage = `╭═⬣ ${title}\n┃ 🔢 Total conectados: *0*\n┃ 🟢 Espacios disponibles: *${availableSlots}*\n╰═${barra}⬣\n\nNo hay subbots conectados por ahora.`;
        } else if (totalUsers <= 15) {
            const listado = users
            .map((v, i) => {
                const num = v.user.jid.replace(/[^0-9]/g, '');
                const nombre = v?.user?.name || v?.user?.pushName || '👤 𝚂𝚄𝙱-𝙱𝙾𝗧';
                const waLink = `https://wa.me/${num}?text=${config.prefix}code`;
                return `╭╼⟪ ${packname} ⟫╾╮\n┃ #${i + 1} 👾 @${num}\n┃ 🌐 Link: ${waLink}\n┃ 🧠 Nombre: ${nombre}\n╰╼▣`;
            })
            .join('\n\n');

            responseMessage = `╭═⬣ ${title}\n┃ 🔢 Total conectados: *${totalUsers}*\n┃ 🟢 Espacios disponibles: *${availableSlots}*\n╰═${barra}⬣\n\n${listado}`.trim();
        } else {
            responseMessage = `╭═⬣ ${title}\n┃ 🔢 Total conectados: *${totalUsers}*\n┃ 🟢 Espacios disponibles: *${availableSlots}*\n╰═${barra}⬣\n\n⚠️ Hay muchos subbots conectados, no se muestra la lista detallada.`;
        }

        responseMessage += `\n\n—\nCreador The Carlos 👑`;

        const imageUrl = 'https://files.catbox.moe/1jkle5.jpg';

        const fkontak = {
            key: {
                participants: "0@s.whatsapp.net",
                remoteJid: "status@broadcast",
                fromMe: false,
                id: "Halo",
            },
            message: {
                contactMessage: {
                    displayName: "Subbot",
                    vcard: "BEGIN:VCARD\nVERSION:3.0\nN:;Subbot;;;\nFN:Subbot\nEND:VCARD",
                },
            },
        };

        const mentions = [...new Set(
            (responseMessage.match(/@(\d{5,16})/g) || []).map(v => v.replace('@', '') + '@s.whatsapp.net')
        )];

        try {
            await conn.sendMessage(
                m.key.remoteJid,
                { image: { url: imageUrl }, caption: responseMessage, mentions },
                { quoted: fkontak }
            );
        } catch (e) {
            console.error('❌ Error enviando listado de subbots:', e);
            await conn.sendMessage(
                m.key.remoteJid,
                { text: responseMessage, mentions },
                { quoted: fkontak }
            );
        }
    }
}
