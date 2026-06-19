const { Client } = require('discord.js-selfbot-v13');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Nhập Token: ", (token) => {
    rl.question("Nhập ID Kênh: ", (channelId) => {
        const client = new Client();
        client.on('ready', () => {
            console.log(`Đã đăng nhập: ${client.user.tag}`);
            const channel = client.channels.cache.get(channelId.trim());
            if (channel) {
                setInterval(() => {
                    channel.send("owo hunt");
                    setTimeout(() => channel.send("owo b"), 5000);
                }, 20000);
            }
        });
        client.login(token).catch(console.error);
        rl.close();
    });
});

