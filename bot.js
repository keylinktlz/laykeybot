const { Telegraf } = require('telegraf');
const axios = require('axios');
const http = require('http');

const BOT_TOKEN = "9001402578:AAFr0uRt9VnpngXyUTlSsqqchvNtuBqL9GQ"; // Token bot của mày
const ADMIN_ID = 782775950; // Telegram User ID của mày (dạng số)
const GAS_URL = "https://script.google.com/macros/s/AKfycbwG5KQlG16FHiDgzWBr-CHTC5RFNt2IGIQVMdXMtnVWi6zBTEmozRUqcQnI4dllu2PeQw/exec"; // URL GAS của mày

const bot = new Telegraf(BOT_TOKEN);
const users = new Map();

function getUserData(userId) {
    if (!users.has(userId)) {
        users.set(userId, {
            coin: 0,
            status: '🔴',
            step: 0
        });
    }
    return users.get(userId);
}

// Hàm tạo Key random ngẫu nhiên
function generateRandomKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'TLZ-';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 1. Lệnh /start
bot.start((ctx) => {
    const userId = Number(ctx.from.id);
    const adminIdNum = Number(ADMIN_ID);
    const userData = getUserData(userId);

    let menuText =
        `👋 Chào mừng **${ctx.from.first_name}** đến với hệ thống!\n\n` +
        `📌 Trạng thái vượt link: ${userData.status}\n` +
        `📊 Tiến trình hôm nay: **${userData.step}/6 lần**\n` +
        `💰 Số Coin hiện có: **${userData.coin}** Coin\n\n` +
        `📜 **Danh sách lệnh:**\n` +
        `• \`/getkey\` : Lấy mã key vượt link nhận coin\n` +
        `• \`/nhapkey <mã_key>\` : Nhập mã key sau khi vượt link\n` +
        `• \`/blike <uid>\` : Buff 200 like (Đổi 4 Coin)\n` +
        `• \`/myid\` : Xem ID Telegram của bạn`;

    if (userId === adminIdNum) {
        menuText += `\n\n👑 **Lệnh Admin:**\n• \`/addcoin <id_tele> <số_coin>\``;
    }

    ctx.reply(menuText, { parse_mode: 'Markdown' });
});

// Lệnh phụ check ID nhanh
bot.command('myid', (ctx) => {
    ctx.reply(`🆔 ID Telegram thật của mày là: \`${ctx.from.id}\``, { parse_mode: 'Markdown' });
});

// 2. Lệnh /getkey
bot.command('getkey', async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);

    if (userData.step >= 6) {
        return ctx.reply("⚠️ Bạn đã đạt giới hạn tối đa 6/6 lần trong ngày!", { parse_mode: 'Markdown' });
    }

    const newKey = generateRandomKey();

    try {
        await axios.get(`${GAS_URL}?action=saveKey&userId=${userId}&key=${newKey}`);
        const dummyShortLink = "https://link4m.net/sb6B7"; 

        const message =
            `🔑 **LẤY KEY VƯỢT LINK (Lần ${userData.step + 1}/6)**\n\n` +
            `🔑 **Mã Key của bạn:** \`${newKey}\`\n` +
            `*(Hãy copy mã key này trước khi bấm vượt link)*\n\n` +
            `👉 **Bước 1:** Bấm nút mở link để vượt qua trang rút gọn.\n` +
            `👉 **Bước 2:** Vượt xong dán vào lệnh: \`/nhapkey ${newKey}\``;

        ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🌐 Mở Link Lấy Key Ngay", url: dummyShortLink }]
                ]
            }
        });
    } catch (error) {
        console.error(error);
        ctx.reply("❌ Lỗi kết nối hệ thống tạo key, vui lòng thử lại sau!");
    }
});

// 3. Lệnh /nhapkey
bot.command('nhapkey', async (ctx) => {
    const userId = ctx.from.id;
    const args = ctx.message.text.split(' ');
    const inputKey = args[1];

    if (!inputKey) {
        return ctx.reply("⚠️ Vui lòng nhập đúng cú pháp: `/nhapkey <mã_key>`", { parse_mode: 'Markdown' });
    }

    try {
        const response = await axios.get(`${GAS_URL}?action=checkKey&key=${inputKey.trim()}`);
        const resData = response.data;

        if (resData.status === "success") {
            const userData = getUserData(userId);
            userData.coin += 1;
            userData.step += 1;
            userData.status = userData.step > 0 ? '🟢' : '🔴';

            return ctx.reply(
                `🎉 **XÁC NHẬN THÀNH CÔNG!**\n\n` +
                `💰 Bạn được cộng: **+1 Coin**\n` +
                `📊 Tiến trình hôm nay: **${userData.step}/6 lần**\n` +
                `💳 Tổng Coin hiện tại: **${userData.coin} Coin**`,
                { parse_mode: 'Markdown' }
            );
        } else if (resData.message === "used") {
            return ctx.reply("❌ Mã Key này đã được sử dụng rồi!", { parse_mode: 'Markdown' });
        } else {
            return ctx.reply("❌ Mã Key không chính xác hoặc không tồn tại!", { parse_mode: 'Markdown' });
        }
    } catch (error) {
        console.error(error);
        ctx.reply("❌ Lỗi kiểm tra key từ máy chủ Google Apps Script!");
    }
});

// 4. Lệnh /blike
bot.command('blike', (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    const args = ctx.message.text.split(' ');
    const targetUid = args[1];

    if (!targetUid) {
        return ctx.reply("⚠️ Vui lòng nhập đúng cú pháp: `/blike <uid_game>`", { parse_mode: 'Markdown' });
    }

    if (userData.coin < 4) {
        return ctx.reply(`❌ Bạn không đủ Coin! Bạn đang có **${userData.coin} Coin**, cần tối thiểu **4 Coin** để buff.`, { parse_mode: 'Markdown' });
    }

    userData.coin -= 4;
    ctx.reply(`✅ **ĐÃ GỬI YÊU CẦU BUFF!**\n\n🎮 UID: \`${targetUid}\`\n🎁 Gói: 200 Like\n💰 Số dư còn lại: **${userData.coin} Coin**`, { parse_mode: 'Markdown' });
});

// 5. Lệnh Admin /addcoin
bot.command('addcoin', (ctx) => {
    const userId = Number(ctx.from.id);
    const adminIdNum = Number(ADMIN_ID);

    if (userId !== adminIdNum) {
        return ctx.reply("⚠️ Bạn không có quyền sử dụng lệnh này!");
    }

    const args = ctx.message.text.split(' ');
    const targetId = parseInt(args[1]);
    const amount = parseInt(args[2]);

    if (!targetId || isNaN(amount)) {
        return ctx.reply("⚠️ Sai cú pháp! Dùng: `/addcoin <id_tele> <số_coin>`", { parse_mode: 'Markdown' });
    }

    const targetData = getUserData(targetId);
    targetData.coin += amount;

    ctx.reply(`✅ Đã cộng thành công **${amount} Coin** cho user \`${targetId}\`. Tổng hiện tại: **${targetData.coin} Coin**`, { parse_mode: 'Markdown' });
});

// Khởi chạy bot Telegram
bot.launch();
console.log("Bot Telegram đã khởi động thành công!");

// Tạo một HTTP Server giả lập để qua mặt cơ chế quét Port của Render Web Service
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!\n');
}).listen(PORT, () => {
    console.log(`HTTP Server đang lắng nghe trên cổng ${PORT}`);
});