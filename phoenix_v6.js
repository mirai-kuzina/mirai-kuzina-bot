const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const axios = require('axios');
const config = require('./config/config.json');
const client = new Client();

const LOCK_FILE = './bot_lock.json';
const REPORT_FILE = './incident_report.json';
const OWO_ID = '408785106942115842';

// Quản lý bộ nhớ đệm phòng thủ nâng cao
const tagTracker = new Map(); 
const TRIGGER_KEYWORDS = ['bot à', 'treo máy', 'auto à', 'sao owo nhanh the', 'admin kìa', 'check bot', 'bú bot', 'gọi admin', 'gậy rồi', 'anti', 'quét bot'];
const FARM_CHANNELS = config.farm_channels || []; 

let totalActionsPerformed = 0;
let isDeepSleeping = false;
let globalCycleCounter = 0;

// === HỆ THỐNG KIỂM TRA ĐIỀU KIỆN VẬT LÝ ===
function isBotLocked() {
    try {
        if (!fs.existsSync(LOCK_FILE)) return false;
        const data = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
        return data.locked === true;
    } catch (e) {
        return false;
    }
}

function lockBot(reason) {
    try {
        fs.writeFileSync(LOCK_FILE, JSON.stringify({ locked: true, reason, time: new Date() }, null, 2));
        console.log(`[🔒 PHOENIX V6 ACTIVATE]: CONTROL APPARATUS LOCKED -> ${reason}`);
    } catch (e) {
        console.error("Không thể ghi file lock vật lý:", e.message);
    }
}

function saveEncryptedLog(dataObject) {
    try {
        const rawString = JSON.stringify(dataObject, null, 2);
        const encryptedData = Buffer.from(rawString).toString('base64');
        fs.writeFileSync(REPORT_FILE, encryptedData, 'utf8');
        console.log(`💾 [LỚP 20 - PHOENIX]: Nhật ký hệ thống đã được bọc mã hóa Base64.`);
    } catch (e) {
        console.error("Lỗi mã hóa log:", e.message);
    }
}

// === LỚP 23: BỘ TỰ DỌN VẾT BỘ NHỚ ĐỆM TRÁNH MEMORY TELEMETRY ===
function runSelfHealingCacheCleaner() {
    try {
        globalCycleCounter++;
        if (globalCycleCounter % 10 === 0) {
            console.log("🧹 [LỚP 23 - HEALING]: Đang dọn dẹp bộ nhớ đệm và giải phóng RAM cục bộ...");
            if (global && global.gc) { global.gc(); } // Gọi dọn rác nếu Node.js bật cờ gc
            tagTracker.clear(); // Xóa lịch sử theo dõi cũ để tránh phình bộ nhớ
        }
    } catch (e) {}
}

// === LỚP 22: THUẬT TOÁN BIẾN THIÊN THỜI GIAN THEO HÀM SỐ SIN ===
function calculateSinusoidalJitter(text) {
    const baseMs = text.length * 210; // Mặc định 210ms một ký tự
    const waveModifier = Math.sin(totalActionsPerformed * 0.15) * 600; // Biến thiên sóng từ -600ms đến +600ms
    const finalDelay = Math.max(1500, baseMs + waveModifier + (Math.random() * 400));
    console.log(`⏳ [LỚP 22 - JITTER]: Độ trễ sóng sinh học được tính toán: ${Math.floor(finalDelay)}ms`);
    return finalDelay;
}

async function sendPhoenixAlert(title, description, contextMessages = []) {
    if (!config.webhook_url) return;
    let contextText = "Không có nhật ký hiện trường.";
    if (contextMessages && contextMessages.length > 0) {
        contextText = contextMessages.map(m => `**[${m.author?.tag || 'Ẩn Danh'}]:** ${m.content || 'Trống'}`).join('\n');
    }
    try {
        await axios.post(config.webhook_url, {
            content: `🚨 🔥 🛑 **[PHƯỢNG HOÀNG TỐI THƯỢNG V6 KÍCH HOẠT]** <@${config.my_main_id}> ACC ĐANG BỊ TẤN CÔNG!`,
            embeds: [{
                title: `🛡️ ${title}`,
                description: description,
                color: 16729104, // Đỏ cam đặc chủng
                fields: [{ name: "📸 Nhật Ký Trực Quan Tại Hiện Trường Kênh:", value: contextText.substring(0, 1024) }],
                timestamp: new Date()
            }]
        });
    } catch (err) {
        console.error("Lỗi truyền tải tín hiệu Webhook:", err.message);
    }
}

function humanDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
}

// === LỚP 21: DUYỆT ĐỆ QUY SIÊU CẤU TRÚC EMBED ĐỂ QUÉT CAPTCHA ẨN ===
function deepTraverseEmbed(embed) {
    if (!embed) return false;
    let pool = [];
    
    if (embed.title) pool.push(embed.title.toLowerCase());
    if (embed.description) pool.push(embed.description.toLowerCase());
    if (embed.footer && embed.footer.text) pool.push(embed.footer.text.toLowerCase());
    if (embed.author && embed.author.name) pool.push(embed.author.name.toLowerCase());
    
    if (embed.fields && embed.fields.length > 0) {
        for (const field of embed.fields) {
            if (field.name) pool.push(field.name.toLowerCase());
            if (field.value) pool.push(field.value.toLowerCase());
        }
    }
    
    if (embed.image && embed.image.url) pool.push(embed.image.url.toLowerCase());
    if (embed.thumbnail && embed.thumbnail.url) pool.push(embed.thumbnail.url.toLowerCase());

    const dangerWords = ["verify", "captcha", "link.owobot.com", "banned", "xác minh"];
    return dangerWords.some(word => pool.some(element => element.includes(word)));
}

// === LỚP 24: CẢM BIẾN KIỂM TRA QUYỀN HẠN KÊNH TRƯỚC KHI GỬI TIN ===
function checkChannelHealth(channel) {
    try {
        if (!channel.guild) return true; // Kênh DM luôn luôn hợp lệ
        const botPermissions = channel.permissionsFor(client.user);
        if (!botPermissions) return false;
        
        const canSend = botPermissions.has('SEND_MESSAGES');
        const canView = botPermissions.has('VIEW_CHANNEL');
        
        if (!canSend || !canView) {
            console.log(`⚠️ [LỚP 24 - HEALTH]: Kênh ${channel.id} đã bị Admin khóa quyền ẩn hoặc read-only! Hủy lệnh.`);
            return false;
        }
        return true;
    } catch (e) {
        return false;
    }
}

client.on('ready', () => {
    console.log(`====================================================`);
    console.log(`🔥 SIÊU PHÁO ĐÀI PHƯỢNG HOÀNG TỐI THƯỢNG V6 ACTIVATED`);
    console.log(`🤖 Mật độ code phòng thủ: 24 LỚP TUYỆT ĐỐI          `);
    console.log(`🤖 Hệ thống vận hành: ${client.user.tag}           `);
    console.log(`====================================================`);
    runCircadianEngine();
});

// LỚP 18: Chu kỳ sinh học nâng cao
function runCircadianEngine() {
    setInterval(() => {
        if (isBotLocked() || isDeepSleeping) return;
        if (totalActionsPerformed > 0 && totalActionsPerformed % (Math.floor(Math.random() * 80) + 200) === 0) {
            isDeepSleeping = true;
            const sleepDuration = Math.floor(Math.random() * 2400000) + 1200000; // Nghỉ từ 20 đến 40 phút
            console.log(`💤 [LỚP 18]: Chu kỳ sinh học kích hoạt trạng thái mệt mỏi. Nghỉ ngơi trong ${sleepDuration / 60000} phút...`);
            client.user.setStatus('idle');
            
            setTimeout(() => {
                isDeepSleeping = false;
                client.user.setStatus('online');
                console.log(`⏰ [LỚP 18]: Kết thúc chu kỳ ngủ sinh học. Tiếp tục chu trình phòng vệ.`);
            }, sleepDuration);
        }
    }, 60000);
}

// === LỚP 13: BẺ GÃY BẪY VOICE / CALL ===
client.on('callCreate', async (call) => {
    if (isBotLocked()) return;
    lockBot("Kích hoạt lá chắn khẩn cấp do phát hiện cuộc gọi lôi kéo (Call Detection)");
    client.user.setStatus('invisible');
    await sendPhoenixAlert("CẢNH BÁO: BẪY GỌI ĐIỆN PHÁ VỠ TELEMETRY", `Phát hiện có cuộc gọi trực tiếp hướng tới bot. Đã hủy kết nối ngay lập tức.`);
    client.destroy();
    process.exit(0);
});

// === LỚP 9: TÓM SỐNG CHIÊU GHOST PING (TAG RỒI XÓA NHANH) ===
client.on('messageDelete', async (deletedMessage) => {
    if (isBotLocked()) return;
    if (!deletedMessage.author || deletedMessage.author.id === client.user.id) return;

    if (deletedMessage.mentions.has(client.user)) {
        lockBot(`Tóm gọn hành vi Ghost Ping xóa dấu vết từ ${deletedMessage.author.tag}`);
        client.user.setStatus('invisible');
        await sendPhoenixAlert(
            "PHÁT HIỆN GHOST PING (TAG XÓA TRONG TÍCH TẮC)",
            `Đối tượng bẫy: **${deletedMessage.author.tag}**\nNội dung tin nhắn gốc bị xóa: "${deletedMessage.content || 'Không có ký tự văn bản (Có thể là Embed/File)'}"`,
            [{ author: deletedMessage.author, content: `[TIN NHẮN BỊ TIÊU HỦY]: ${deletedMessage.content || 'Trống'}` }]
        );
        client.destroy();
        process.exit(0);
    }
});

// === LỚP 19: BẪY SỬA TIN NHẮN (MESSAGE UPDATE RADAR) ===
client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (isBotLocked()) return;
    if (!newMessage.author || newMessage.author.id === client.user.id) return;

    const newContentLower = newMessage.content ? newMessage.content.toLowerCase() : "";
    const isNowTagged = newMessage.mentions.has(client.user);
    const hasBadKeyword = TRIGGER_KEYWORDS.some(k => newContentLower.includes(k));

    if (isNowTagged || hasBadKeyword) {
        lockBot(`Phát hiện hành vi EDIT tin nhắn hòng gài bẫy bot từ ${newMessage.author.tag}`);
        client.user.setStatus('invisible');
        await sendPhoenixAlert(
            "PHÁT HIỆN HÀNH VI SỬA TIN NHẮN ĐỂ GÀI BẪY ACC",
            `User: **${newMessage.author.tag}**\nNội dung cũ: "${oldMessage.content || 'Không rõ'}"\nNội dung mới sau khi sửa: "${newMessage.content || 'Trống'}"`,
            [{ author: newMessage.author, content: `[BẪY EDIT]: ${newMessage.content}` }]
        );
        client.destroy();
        process.exit(0);
    }
});

// === HỆ THỐNG PHÂN TÍCH RADAR TRUNG TÂM ===
client.on('messageCreate', async (message) => {
    if (isBotLocked() || isDeepSleeping) return;
    if (!message.author || message.author.id === client.user.id) return;

    // Lớp 24: Kiểm tra xem quyền hạn tại kênh có an toàn để tiếp tục đọc/ghi hay không
    if (!checkChannelHealth(message.channel)) return;

    totalActionsPerformed++;
    runSelfHealingCacheCleaner(); // Chạy bộ dọn rác Lớp 23

    // Lớp 16: Trì hoãn mô phỏng thời gian đọc màn hình của mắt người
    await humanDelay(700, 1600);

    const contentLower = message.content ? message.content.toLowerCase() : "";
    const myUsername = client.user.username.toLowerCase();
    
    // TRÌNH QUÉT SIÊU CẤU TRÚC CAPTCHA ĐA TẦNG (LỚP 1, 3, 4, 21)
    let isCaptchaDetected = false;
    
    if (message.author.id === OWO_ID || message.channel.type === 'DM') {
        if (contentLower.includes("verify") || contentLower.includes("captcha") || contentLower.includes("link.owobot.com")) {
            isCaptchaDetected = true;
        }
        
        // Kích hoạt Lớp 21 quét đệ quy sâu vào cấu trúc mảng Embeds
        if (!isCaptchaDetected && message.embeds && message.embeds.length > 0) {
            for (const embed of message.embeds) {
                if (deepTraverseEmbed(embed)) {
                    isCaptchaDetected = true;
                    break;
                }
            }
        }

        if (isCaptchaDetected) {
            lockBot("Phát hiện mã độc Captcha OwO qua hệ thống phân tích đệ quy V6");
            client.user.setStatus('invisible');
            
            const logs = await message.channel.messages.fetch({ limit: 5 });
            await sendPhoenixAlert("LÁ CHẮN PHƯƠNG HOÀNG SẬP NGUỒN KHẨN CẤP DO CAPTCHA", `Đã bảo vệ tài khoản an toàn trước đợt quét mã xác minh của OwO Bot.`, [...logs.values()].reverse());
            
            client.destroy();
            process.exit(0);
            return;
        }
    }

    // KIỂM TRA PHÂN TÍCH HÀNH VI SOI MÓI TỪ ADMIN HOẶC USER KHÁC
    const isTagged = message.mentions.has(client.user);
    let isReplied = false;
    if (message.reference && message.reference.messageId) {
        try {
            const rMsg = await message.channel.messages.fetch(message.reference.messageId);
            if (rMsg.author.id === client.user.id) isReplied = true;
        } catch (e) {}
    }
    const hasKeyword = TRIGGER_KEYWORDS.some(k => contentLower.includes(k));
    const hasMyName = contentLower.includes(myUsername);

    if (isTagged || isReplied || hasKeyword || hasMyName) {
        
        // LỚP 10: CHỐNG BẪY SPAM KHỦNG BỐ HÀNH VI
        const authorId = message.author.id;
        const now = Date.now();
        const userData = tagTracker.get(authorId) || { count: 0, lastTime: 0 };
        
        if (now - userData.lastTime < 15000) userData.count++;
        else userData.count = 1;
        userData.lastTime = now;
        tagTracker.set(authorId, userData);

        if (userData.count >= 3) {
            lockBot(`Phát hiện hành vi cố tình lạm dụng spam tag liên hồi từ ${message.author.tag}`);
            client.user.setStatus('invisible');
            client.destroy();
            process.exit(0);
            return;
        }

        // TIẾN HÀNH PHẢN ĐÒN VÀ ẨN NẤP NGAY LẬP TỨC
        client.user.setStatus('invisible'); 

        const logs = await message.channel.messages.fetch({ limit: 5 });
        const logsArr = [...logs.values()].reverse();

        const botReply = config.reply_answers[Math.floor(Math.random() * config.reply_answers.length)];
        
        // Kích hoạt Lớp 22: Thuật toán biến thiên thời gian Jitter hình sin
        const requiredTypingMs = calculateSinusoidalJitter(botReply);
        
        message.channel.sendTyping();
        const typingInterval = setInterval(() => message.channel.sendTyping(), 4000);

        setTimeout(async () => {
            clearInterval(typingInterval);
            try {
                // Tái kiểm tra sức khỏe kênh (Lớp 24) một lần nữa trước khi bấm nút gửi tin nhắn rep
                if (checkChannelHealth(message.channel)) {
                    await message.reply(botReply);
                    console.log(`💬 Đã phản hồi ngụy trang hoàn tất câu chữ: "${botReply}"`);
                }
            } catch (err) {
                console.error("Lỗi gửi tin phản hồi ngụy trang:", err.message);
            }

            saveEncryptedLog({
                targetUser: message.author.tag,
                inputContent: message.content,
                outputReply: botReply,
                systemMetrics: { totalActionsPerformed, globalCycleCounter },
                date: new Date()
            });

            lockBot(`Đã hoàn tất chu trình rep và lập tức đưa hệ thống vào trạng thái ngủ đông sâu.`);
            await sendPhoenixAlert(`CẢNH BÁO BỊ SOI ACC: ĐÃ PHẢN HỒI VÀ TỰ ĐỘNG TẮT NGUỒN CỨU ACC`, `Kẻ nghi vấn: **${message.author.tag}**\nNội dung họ gõ: "${message.content}"\nBot phản hồi giả lập: "${botReply}"`, logsArr);
            
            client.destroy();
            process.exit(0);
        }, requiredTypingMs);
    }
});

client.login(config.token);
