const { Telegraf } = require('telegraf');

// ==================== CẤU HÌNH THÔNG TIN ====================
const BOT_TOKEN = '9001402578:AAFr0uRt9VnpngXyUTlSsqqchvNtuBqL9GQ'; // Thay token bot của mày vào đây
const ADMIN_ID = 7827755950; // Telegram User ID của mày

// Danh sách các link rút gọn (Link4m / Linkfree / Gtraffic)
const listShortLinks = [
    "https://link4m.org/WfjwHvo",
            "https://linkfree.click/s/keynewbotz1u1h36mvxi47e6",
            "https://linkfree.click/s/keynewbotz1u1h36mvxi47e6",
            "https://linkfree.click/s/keynewbotz1u1h36mvxi47e6",
            "https://gtraffic.io/-L-BQB6",
            "https://gtraffic.io/-MF6LQh"
];

const bot = new Telegraf(BOT_TOKEN);

const users = new Map();
const pendingBuffs = new Map();

function getUserData(userId) {
    if (!users.has(userId)) {
        users.set(userId, {
            coin: 0,
            status: '🔴',
            activeKey: null,
            keyCreatedAt: null,
            step: 0
        });
    }
    const data = users.get(userId);

    if (data.keyCreatedAt && (Date.now() - data.keyCreatedAt > 24 * 60 * 60 * 1000)) {
        data.status = '🔴';
        data.activeKey = null;
        data.keyCreatedAt = null;
        data.step = 0;
    }

    return data;
}

function generateRandomCode() {
    return 'KEY-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

// 1. Lệnh /start (Hỗ trợ xác thực tự động qua Deep Linking)
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    const payload = ctx.startPayload;

    if (payload) {
        if (userData.activeKey && payload.toUpperCase() === userData.activeKey.toUpperCase() && userData.step < 6) {
            userData.status = '🟢';
            userData.coin += 1; 
            userData.activeKey = null; 
            userData.step += 1; 
            const completedStep = userData.step;

            let nextStepInfo = completedStep < 6
                ? `💡 *Tiến trình hiện tại: ${completedStep}/6. Gõ /getkey để lấy link tiếp theo.*`
                : `🎉 **CHÚC MỪNG! Bạn đã hoàn thành tối đa 6/6 lần trong ngày hôm nay!**`;

            return ctx.reply(
                `🎉 **XÁC MINH THÀNH CÔNG (Lần ${completedStep}/6)!**\n\n` +
                `🟢 Trạng thái: **Đã vượt link**\n` +
                `🎁 Thưởng: **+1 Coin**\n` +
                `💰 Tổng Coin: **${userData.coin}** Coin\n\n` +
                nextStepInfo,
                { parse_mode: 'Markdown' }
            );
        } else {
            return ctx.reply("❌ Mã Key xác minh không hợp lệ hoặc đã được sử dụng!");
        }
    }

    let menuText =
        `👋 Chào mừng **${ctx.from.first_name}** đến với hệ thống!\n\n` +
        `📌 Trạng thái vượt link: ${userData.status}\n` +
        `📊 Tiến trình hôm nay: **${userData.step}/6 lần**\n` +
        `💰 Số Coin hiện có: **${userData.coin}** Coin\n\n` +
        `📜 **Danh sách lệnh:**\n` +
        `• \`/getkey\` : Lấy link vượt để nhận coin (Tối đa 6 lần/ngày)\n` +
        `• \`/nhapkey <mã_key>\` : Nhập mã key sau khi vượt link\n` +
        `• \`/blike <uid>\` : Buff 200 like (Đổi 4 Coin)`;

    if (ctx.from.id === ADMIN_ID) {
        menuText += `\n\n👑 **Lệnh Admin:**\n• \`/addcoin <id_tele> <số_coin>\``;
    }

    ctx.reply(menuText, { parse_mode: 'Markdown' });
});

// 2. Lệnh /getkey - Gửi link vượt link
bot.command('getkey', (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    const userName = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

    if (userData.step >= 6) {
        return ctx.reply(
            `⚠️ **BẠN ĐÃ ĐẠT GIỚI HẠN TỐI ĐA (6/6 LẦN TRONG NGÀY)!**\n\n` +
            `⏳ Vui lòng quay lại sau 24h để tiếp tục!`,
            { parse_mode: 'Markdown' }
        );
    }

    if (!userData.keyCreatedAt) {
        userData.keyCreatedAt = Date.now();
    }

    const currentStep = userData.step;
    const newKey = generateRandomCode();
    userData.activeKey = newKey; 

    const randomShortLink = listShortLinks[Math.floor(Math.random() * listShortLinks.length)];

    const message =
        `🔑 **LẤY KEY VƯỢT LINK (Lần ${currentStep + 1}/6)**\n\n` +
        `👉 **Tài khoản:** ${userName}\n` +
        `👉 **Tiến trình:** ${currentStep}/6\n\n` +
        `⚠️ **Hướng dẫn:** Bấm nút bên dưới để vào trang vượt link lấy mã nhé!`;

    ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: "🌐 Mở Link Lấy Key Ngay", url: randomShortLink }],
                [{ text: "🔄 Đổi Link Khác", callback_data: "doi_link" }]
            ]
        }
    });
});

// Xử lý nút Đổi Link Khác
bot.action('doi_link', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    if (userData.step >= 6) return ctx.reply("⚠️ Bạn đã hoàn thành tối đa 6/6 lần!");

    const newKey = generateRandomCode();
    userData.activeKey = newKey;
    const randomShortLink = listShortLinks[Math.floor(Math.random() * listShortLinks.length)];

    await ctx.reply(
        `🔄 **ĐÃ ĐỔI LINK XÁC THỰC MỚI (Lần ${userData.step + 1}/6)!**\n\n` +
        `📌 Hãy bấm nút bên dưới để vượt link lấy mã mới nhé!`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🌐 Mở Link Lấy Key Ngay", url: randomShortLink }]
                ]
            }
        }
    );
});

// 3. Lệnh /nhapkey - Nhập key thủ công
bot.command('nhapkey', async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    const input = ctx.message.text.split(' ');
    const userEnteredKey = input[1];

    if (!userEnteredKey) {
        return ctx.reply("❌ Vui lòng nhập đúng cú pháp: `/nhapkey <mã_key>`", { parse_mode: 'Markdown' });
    }

    if (userData.step >= 6) {
        return ctx.reply("⚠️ Bạn đã hoàn thành tối đa 6/6 lần trong ngày hôm nay rồi!");
    }

    if (userData.activeKey && userEnteredKey.trim().toUpperCase() === userData.activeKey.toUpperCase()) {
        userData.status = '🟢';
        userData.coin += 1; 
        userData.activeKey = null; 
        userData.step += 1; 
        const completedStep = userData.step;

        let nextStepInfo = completedStep < 6
            ? `💡 *Tiến trình hiện tại: ${completedStep}/6. Gõ /getkey để lấy link tiếp theo.*`
            : `🎉 **CHÚC MỪNG! Bạn đã hoàn thành tối đa 6/6 lần trong ngày hôm nay!**`;

        return ctx.reply(
            `🎉 **NHẬP KEY XÁC MINH THÀNH CÔNG (Lần ${completedStep}/6)!**\n\n` +
            `🟢 Trạng thái: **Đã vượt link**\n` +
            `🎁 Thưởng: **+1 Coin**\n` +
            `💰 Tổng Coin: **${userData.coin}** Coin\n\n` +
            nextStepInfo,
            { parse_mode: 'Markdown' }
        );
    } else {
        return ctx.reply("❌ Mã Key không chính xác, đã được sử dụng hoặc đã hết hạn!");
    }
});

// 4. Lệnh /blike
bot.command('blike', async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    const input = ctx.message.text.split(' ');
    const gameUid = input[1];

    if (!gameUid) {
        return ctx.reply("❌ Vui lòng nhập đúng cú pháp: `/blike <UID_GAME>`", { parse_mode: 'Markdown' });
    }

    if (userData.status !== '🟢') {
        return ctx.reply("🔴 Bạn chưa vượt link! Hãy gõ `/getkey` để hoàn thành vượt link trước.");
    }

    const requiredCoins = 4;
    if (userData.coin < requiredCoins) {
        return ctx.reply(`❌ Bạn không đủ Coin! Cần **${requiredCoins} Coin** để đổi 200 like (Hiện có: ${userData.coin} Coin).`);
    }

    const buffId = 'BUFF-' + Date.now();
    pendingBuffs.set(buffId, {
        userId: userId,
        gameUid: gameUid,
        requiredCoins: requiredCoins,
        status: 'PENDING'
    });

    await ctx.reply(
        `⏳ **ĐÃ GỬI YÊU CẦU BUFF LIKE TỚI ADMIN!**\n\n` +
        `🎮 UID Game: \`${gameUid}\`\n` +
        `📦 Gói: **200 Like** (Giá 4 Coin)\n` +
        `📌 Đang chờ Admin kiểm tra.`,
        { parse_mode: 'Markdown' }
    );

    try {
        const adminMessage =
            `🔔 **YÊU CẦU BUFF LIKE CẦN DUYỆT!**\n\n` +
            `👤 Người gửi: ${ctx.from.first_name} (@${ctx.from.username || 'N/A'})\n` +
            `🆔 Telegram ID: \`${userId}\`\n` +
            `🎮 **UID Game:** \`${gameUid}\`\n` +
            `💰 Số dư: ${userData.coin} Coin\n` +
            `⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}`;
        await bot.telegram.sendMessage(ADMIN_ID, adminMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Xác Nhận (Trừ 4 Coin)", callback_data: `approve_${buffId}` },
                        { text: "❌ Từ Chối", callback_data: `reject_${buffId}` }
                    ]
                ]
            }
        });
    } catch (error) {
        console.error("Lỗi gửi thông báo Admin:", error.message);
    }
});

// Admin Duyệt / Từ Chối Buff
bot.action(/^approve_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;

    const buffId = ctx.match[1];
    const buffData = pendingBuffs.get(buffId);

    if (!buffData || buffData.status !== 'PENDING') {
        return ctx.editMessageText("⚠️ Đơn này đã được xử lý hoặc không tồn tại!");
    }

    const targetUser = getUserData(buffData.userId);

    if (targetUser.coin < buffData.requiredCoins) {
        buffData.status = 'FAILED';
        await ctx.editMessageText(`❌ **DUYỆT THẤT BẠI!** User không đủ coin.`, { parse_mode: 'Markdown' });
        return;
    }

    targetUser.coin -= buffData.requiredCoins;
    buffData.status = 'APPROVED';

    await ctx.editMessageText(
        `✅ **ĐÃ XÁC NHẬN BUFF LIKE THÀNH CÔNG!**\n\n` +
        `🎮 UID Game: \`${buffData.gameUid}\`\n` +
        `👤 User ID: \`${buffData.userId}\`\n` +
        `📉 Đã trừ: **-${buffData.requiredCoins} Coin** (Còn lại: ${targetUser.coin} Coin)`,
        { parse_mode: 'Markdown' }
    );

    try {
        await bot.telegram.sendMessage(
            buffData.userId,
            `🎉 **YÊU CẦU BUFF LIKE ĐÃ ĐƯỢC DUYỆT!**\n\n` +
            `🎮 UID Game: \`${buffData.gameUid}\`\n` +
            `📦 Gói: **200 Like**\n` +
            `💰 Số Coin còn lại: **${targetUser.coin}** Coin\n` +
            `🚀 Hệ thống đang tiến hành buff like cho bạn!`,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {}
});

bot.action(/^reject_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;

    const buffId = ctx.match[1];
    const buffData = pendingBuffs.get(buffId);

    if (!buffData || buffData.status !== 'PENDING') {
        return ctx.editMessageText("⚠️ Đơn này đã được xử lý hoặc không tồn tại!");
    }

    buffData.status = 'REJECTED';
    const targetUser = getUserData(buffData.userId);

    await ctx.editMessageText(
        `❌ **ĐÃ TỪ CHỐI YÊU CẦU BUFF!**\n\n` +
        `🎮 UID Game lỗi: \`${buffData.gameUid}\``,
        { parse_mode: 'Markdown' }
    );

    try {
        await bot.telegram.sendMessage(
            buffData.userId,
            `❌ **YÊU CẦU BUFF LIKE BỊ TỪ CHỐI / LỖI UID!**\n\n` +
            `💰 Coin của bạn **chưa bị trừ** (Hiện có: **${targetUser.coin}** Coin).`,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {}
});

// Lệnh cộng coin dành riêng cho Admin
bot.command('addcoin', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("⛔ Bạn không có quyền Admin!");

    const input = ctx.message.text.split(' ');
    const targetUserId = parseInt(input[1]);
    const amount = parseInt(input[2]);

    if (!targetUserId || isNaN(amount)) {
        return ctx.reply("❌ **Sai cú pháp!** Nhập: `/addcoin <telegram_id> <số_coin>`", { parse_mode: 'Markdown' });
    }

    const targetUserData = getUserData(targetUserId);
    targetUserData.coin += amount;

    await ctx.reply(
        `✅ **CỘNG COIN THÀNH CÔNG!**\n\n` +
        `👤 User ID: \`${targetUserId}\`\n` +
        `➕ Thêm: **+${amount} Coin**\n` +
        `💰 Tổng Coin: **${targetUserData.coin}** Coin`,
        { parse_mode: 'Markdown' }
    );
});

// Khởi chạy bot
bot.launch();
console.log("Bot Telegram đã khởi động thành công và chạy ổn định!");

// Web Server giữ cho Render không ngủ đông
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running smooth 24/7!\n');
}).listen(PORT, () => {
    console.log(`Web server is listening on port ${PORT}`);
});
