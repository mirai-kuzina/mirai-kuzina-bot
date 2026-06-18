const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const axios = require('axios');
const express = require('express'); // Lớp thư viện Web mới
const config = require('./config/config.json');

const client = new Client();
const app = express();
const WEB_PORT = config.web_port || 3000;

const LOCK_FILE = './bot_lock.json';
const OWO_ID = '408785106942115842';

// CƠ SỞ DỮ LIỆU ĐỆM PHỤC VỤ WEB DASHBOARD (CHIA KHU VỰC)
const dashboardData = {
    systemStatus: { status: "ONLINE", totalActions: 0, uptime: new Date(), isSleeping: false, lastLockReason: "None" },
    battleLogs: [],    // Khu vực 2: Lưu trữ battle + hình ảnh
    securityLogs: [],  // Khu vực 3: Lưu trữ cảnh báo bảo mật, captcha
    managedChannels: config.farm_channels || [] // Khu vực 4: Quản lý phân vùng kênh
};

function isBotLocked() {
    try { return fs.existsSync(LOCK_FILE); } catch (e) { return false; }
}

function lockBot(reason) {
    try {
        fs.writeFileSync(LOCK_FILE, JSON.stringify({ locked: true, reason, time: new Date() }, null, 2));
        dashboardData.systemStatus.status = "LOCKED";
        dashboardData.systemStatus.lastLockReason = reason;
    } catch (e) {}
}

// === HỆ THỐNG MÁY CHỦ WEB DASHBOARD TÍCH HỢP (TAILWIND UI) ===
app.get('/', (req, res) => {
    // Tạo danh sách HTML động cho Battle Logs
    const battleRows = dashboardData.battleLogs.map(b => `
        <div class="flex items-center gap-4 bg-gray-800 p-3 rounded-lg border border-gray-700">
            ${b.image ? `<img src="${b.image}" class="w-14 h-14 object-contain rounded bg-gray-900 p-1 border border-amber-500/30" onerror="this.style.display='none'">` : `<div class="w-14 h-14 bg-gray-900 rounded flex items-center justify-center text-xs text-gray-500">No Img</div>`}
            <div class="flex-1">
                <div class="text-xs text-amber-400 font-mono">${b.time}</div>
                <div class="text-sm text-gray-200 mt-1 whitespace-pre-line">${b.content}</div>
            </div>
        </div>
    `).join('');

    // Tạo danh sách HTML cho Security Logs
    const securityRows = dashboardData.securityLogs.map(s => `
        <div class="bg-red-950/40 border border-red-500/30 p-3 rounded-lg font-mono text-xs text-red-300">
            <span class="text-red-400">[${s.time}]</span> ${s.event}
        </div>
    `).join('<div class="h-2"></div>');

    // Giao diện hoàn chỉnh chia 4 khu vực điều khiển
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Phoenix V7 - Pháo Đài Điều Khiển</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <meta http-equiv="refresh" content="5"> <!-- Tự động F5 mỗi 5 giây để cập nhật log -->
    </head>
    <body class="bg-gray-950 text-gray-100 min-h-screen font-sans p-4 md:p-8">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <header class="flex justify-between items-center border-b border-gray-800 pb-4 mb-6">
                <div>
                    <h1 class="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400">PHOENIX ULTIMATE V7</h1>
                    <p class="text-xs text-gray-400 font-mono mt-1">Trạm Giám Sát Luồng Bộ Nhớ Vật Lý</p>
                </div>
                <div class="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-full border border-gray-800">
                    <span class="w-3 h-3 rounded-full ${dashboardData.systemStatus.status === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}"></span>
                    <span class="text-sm font-mono font-bold">${dashboardData.systemStatus.status}</span>
                </div>
            </header>

            <!-- Grid 4 Khu Vực Biệt Lập -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <!-- KHU VỰC 1: TỔNG QUAN HỆ THỐNG & ANALYTICS -->
                <div class="bg-gray-900 p-5 rounded-xl border border-gray-800 flex flex-col justify-between">
                    <div>
                        <h2 class="text-sm font-bold uppercase text-gray-400 tracking-wide border-l-4 border-orange-500 pl-2 mb-4">Khu Vực 1: Monitor & Cấu Hình</h2>
                        <div class="space-y-3 font-mono text-xs">
                            <div class="flex justify-between border-b border-gray-800 pb-2">
                                <span class="text-gray-500">Tổng hành vi:</span>
                                <span class="text-amber-400 font-bold">${dashboardData.systemStatus.totalActions} lđ</span>
                            </div>
                            <div class="flex justify-between border-b border-gray-800 pb-2">
                                <span class="text-gray-500">Trạng thái ngủ:</span>
                                <span class="${dashboardData.systemStatus.isSleeping ? 'text-indigo-400' : 'text-green-400'}">${dashboardData.systemStatus.isSleeping ? 'Đang Ngủ Sinh Học' : 'Hoạt Động'}</span>
                            </div>
                            <div class="flex flex-col gap-1 border-b border-gray-800 pb-2">
                                <span class="text-gray-500">Lý do khóa gần nhất:</span>
                                <span class="text-red-400 italic break-words">${dashboardData.systemStatus.lastLockReason}</span>
                            </div>
                        </div>
                    </div>
                    <div class="mt-4 text-[10px] text-gray-600 font-mono text-center">Bấm F5 để nạp lại dữ liệu theo thời gian thực</div>
                </div>

                <!-- KHU VỰC 2: NHẬT KÝ BATTLE & TRỰC QUAN HÌNH ẢNH (RỘNG 2 CỘT) -->
                <div class="lg:col-span-2 bg-gray-900 p-5 rounded-xl border border-gray-800">
                    <h2 class="text-sm font-bold uppercase text-gray-400 tracking-wide border-l-4 border-amber-500 pl-2 mb-4">Khu Vực 2: Nhật Ký Battle & Thực Vật Học (OwO Image Log)</h2>
                    <div class="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        ${battleRows.length > 0 ? battleRows : '<div class="text-center text-sm text-gray-600 py-8 font-mono">Chưa ghi nhận trận đánh nào...</div>'}
                    </div>
                </div>

                <!-- KHU VỰC 3: GIÁM SÁT CAPTCHA VÀ PHÒNG THỦ KHẨN CẤP -->
                <div class="bg-gray-900 p-5 rounded-xl border border-gray-800">
                    <h2 class="text-sm font-bold uppercase text-gray-400 tracking-wide border-l-4 border-red-500 pl-2 mb-4">Khu Vực 3: Phòng Thự Radar (Anti-Captcha)</h2>
                    <div class="max-h-[250px] overflow-y-auto pr-2">
                        ${securityRows.length > 0 ? securityRows : '<div class="text-center text-xs text-gray-600 py-4 font-mono">Lá chắn an toàn. Không có cảnh báo độc hại.</div>'}
                    </div>
                </div>

                <!-- KHU VỰC 4: QUẢN LÝ PHÂN VÙNG KÊNH FARM -->
                <div class="lg:col-span-2 bg-gray-900 p-5 rounded-xl border border-gray-800">
                    <h2 class="text-sm font-bold uppercase text-gray-400 tracking-wide border-l-4 border-green-500 pl-2 mb-4">Khu Vực 4: Phân Vùng Kênh Đang Được Bảo Vệ</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-xs">
                        ${dashboardData.managedChannels.map((ch, idx) => `
                            <div class="bg-gray-950 p-2 rounded border border-gray-800 flex justify-between items-center">
                                <span class="text-gray-400">Kênh #${idx + 1}:</span>
                                <span class="text-green-400 font-bold">${ch}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

            </div>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

app.listen(WEB_PORT, () => {
    console.log(`🌐 [WEB DASHBOARD]: Đang mở cổng máy chủ tại http://localhost:${WEB_PORT}`);
});

// === ĐỒNG BỘ EVENT VỚI BOT DISCORD ===
client.on('ready', () => {
    console.log(`🔥 SIÊU PHÁO ĐÀI PHƯỢNG HOÀNG V7 - DASHBOARD ONLINE`);
});

client.on('messageCreate', async (message) => {
    if (isBotLocked()) return;
    if (!message.author) return;

    dashboardData.systemStatus.totalActions++;

    const contentLower = message.content ? message.content.toLowerCase() : "";
    const timeStr = new Date().toLocaleTimeString();

    // THU THẬP LOG CHO KHU VỰC 2: BATTLE LOGS & HÌNH ẢNH 
    if (message.author.id === OWO_ID) {
        const isBattleEmbed = message.embeds[0] && JSON.stringify(message.embeds[0]).toLowerCase().includes("battle");
        const isBattleText = contentLower.includes("battle") || contentLower.includes("vs");

        if (isBattleText || isBattleEmbed) {
            // Trích xuất hình ảnh (avatar quái vật, vũ khí, hình nền battle) từ Embed
            let extractedImg = "";
            if (message.embeds[0]) {
                extractedImg = message.embeds[0].thumbnail?.url || message.embeds[0].image?.url || "";
            }
            
            let logContent = message.content || message.embeds[0]?.description || message.embeds[0]?.title || "Trận chiến OwO diễn ra";

            // Thêm vào đầu mảng log
            dashboardData.battleLogs.unshift({
                time: timeStr,
                content: logContent,
                image: extractedImg
            });

            // Giới hạn bộ nhớ đệm tránh tràn RAM trên điện thoại
            if (dashboardData.battleLogs.length > 30) dashboardData.battleLogs.pop();
        }

        // THU THẬP LOG CHO KHU VỰC 3: PHÒNG THỦ ANTI-CAPTCHA
        if (contentLower.includes("verify") || contentLower.includes("captcha") || contentLower.includes("link.owobot.com")) {
            lockBot("Phát hiện mã độc Captcha OwO tại dòng thời gian thực!");
            dashboardData.securityLogs.unshift({ time: timeStr, event: "⚠️ PHÁT HIỆN CAPTCHA! LẬP TỨC KHÓA BOT ĐỂ BẢO VỆ ACC." });
            client.destroy();
            process.exit(0);
        }
    }
});

client.login(config.token);
