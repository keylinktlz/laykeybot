const { Telegraf, Markup } = require('telegraf');

// ==================== CẤU HÌNH THÔNG TIN ====================
const BOT_TOKEN = '9001402578:AAFr0uRt9VnpngXyUTlSsqqchvNtuBqL9GQ'; // Thay token mới của bạn vào đây
const ADMIN_ID = 7827755950; // Telegram User ID thực tế của bạn
const GITHUB_WEB_URL = 'https://laykeybot.github.io/laykeybot/'; // Link trang web GitHub Pages của mày

const bot = new Telegraf(BOT_TOKEN);

// Bộ nhớ tạm lưu trữ thông tin người dùng và danh sách các đơn buff đang chờ duyệt
const users = new Map(); // userID -> { coin, status, activeKey, keyCreatedAt, step }
const pendingBuffs = new Map(); // buffId -> { userId, gameUid, requiredCoins, status }

// Hàm lấy dữ liệu user & tự động reset sau 24h
function getUserData(userId) {
    if (!users.has(userId)) {
        users.set(userId, {
            coin: 0,
            status: '🔴',
            activeKey: null,
            keyCreatedAt: null,
            step: 0 // Đếm số lần hoàn thành (0 đến 6)
        });
    }
    const data = users.get(userId);

    // Tự động reset tiến trình & trạng thái sau 24h tính từ lần làm đầu tiên trong ngày
    if (data.keyCreatedAt && (Date.now() - data.keyCreatedAt > 24 * 60 * 60 * 1000)) {
        data.status = '🔴';
        data.activeKey = null;
        data.keyCreatedAt = null;
        data.step = 0;
    }

    return data;
}

// Hàm sinh mã ngẫu nhiên chống trùng lặp
function generateRandomCode() {
    return 'KEY-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

// ==================== XỬ LÝ LỆNH BOT ====================

// 1. Lệnh /start (Xử lý chào mừng & Tự động nhận Key từ Link trả về)
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    const payload = ctx.startPayload; // Lấy mã key gửi từ link GitHub trả về

    // --- XÁC MINH VƯỢT LINK TRẢ VỀ TỪ WEB GITHUB ---
    if (payload) {
        if (userData.activeKey && payload === userData.activeKey && userData.step < 6) {
            userData.status = '🟢';
            userData.coin += 1; // +1 Coin khi vượt link thành công
            userData.activeKey = null; // Xóa key để chống dùng lại
            userData.step += 1; // Tăng tiến trình hoàn thành lên
            const completedStep = userData.step;

            let nextStepInfo = completedStep < 6
                ? `💡 *Tiến trình hiện tại: ${completedStep}/6. Gõ /getkey để lấy link tiếp theo.*`
                : `🎉 **CHÚC MỪNG! Bạn đã hoàn thành tối đa 6/6 lần trong ngày hôm nay!**`;

            return ctx.reply(
                `🎉 **XÁC MINH VƯỢT LINK THÀNH CÔNG (Lần ${completedStep}/6)!**\n\n` +
                `🟢 Trạng thái tài khoản: **Đã vượt link**\n` +
                `🎁 Thưởng thêm: **+1 Coin**\n` +
                `💰 Tổng Coin hiện tại: **${userData.coin}** Coin\n\n` +
                nextStepInfo,
                { parse_mode: 'Markdown' }
            );
        } else {
            return ctx.reply("❌ Mã Key xác minh không hợp lệ, đã được sử dụng hoặc tiến trình đã hoàn tất!");
        }
    }

    // --- MENU KHI BẤM /START THÔNG THƯỜNG ---
    let menuText =
        `👋 Chào mừng **${ctx.from.first_name}** đến với hệ thống!\n\n` +
        `📌 Trạng thái vượt link: ${userData.status}\n` +
        `📊 Tiến trình hôm nay: **${userData.step}/6 lần**\n` +
        `💰 Số Coin hiện có: **${userData.coin}** Coin\n\n` +
        `📜 **Danh sách lệnh:**\n` +
        `• \`/getkey\` : Lấy link vượt để nhận coin (Tối đa 6 lần/ngày)\n` +
        `• \`/blike <uid>\` : Buff 200 like (Đổi 4 Coin)`;

    if (ctx.from.id === ADMIN_ID) {
        menuText += `\n\n👑 **Lệnh Admin:**\n• \`/addcoin <id_tele> <số_coin>\` : Thêm coin cho user`;
    }

    ctx.reply(menuText, { parse_mode: 'Markdown' });
});

// 2. Lệnh /getkey - Gửi trang Web GitHub kèm Token để user vượt link
bot.command('getkey', (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    const userName = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

    // Chặn nếu đã đạt giới hạn 6/6
    if (userData.step >= 6) {
        return ctx.reply(
            `⚠️ **BẠN ĐÃ ĐẠT GIỚI HẠN TỐI ĐA (6/6 LẦN TRONG NGÀY)!**\n\n` +
            `⏳ Hệ thống đã khóa tạm thời. Vui lòng quay lại sau 24h kể từ lần làm đầu tiên để tiếp tục!`,
            { parse_mode: 'Markdown' }
        );
    }

    // Đánh dấu thời điểm tính giờ 24h
    if (!userData.keyCreatedAt) {
        userData.keyCreatedAt = Date.now();
    }

    const currentStep = userData.step;
    const newKey = generateRandomCode();
    userData.activeKey = newKey;

    // Tạo link trỏ sang web GitHub và nhét key độc quyền vào query params
    const webRedirectLink = `${GITHUB_WEB_URL}?key=${newKey}`;

    const message =
        `🔗 **TRANG XÁC THỰC LẤY KEY (Lần ${currentStep + 1}/6)**\n\n` +
        `👉 **Tài khoản:** ${userName}\n` +
        `👉 **Tiến trình:** ${currentStep}/6\n\n` +
        `⚠️ **Hướng dẫn:** Bấm nút bên dưới để vào trang web đếm ngược, vượt link rút gọn để nhận coin tự động nhé!`;

    ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: "🌐 Mở Web Lấy Key (5s)", url: webRedirectLink }],
                [{ text: "🔄 Lấy Link Mới", callback_data: "doi_link" }]
            ]
        }
    });
});

// Nút bấm Lấy Link Mới dự phòng
bot.action('doi_link', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    if (userData.step >= 6) return ctx.reply("⚠️ Bạn đã hoàn thành tối đa 6/6 lần!");

    const newKey = generateRandomCode();
    userData.activeKey = newKey;
    const webRedirectLink = `${GITHUB_WEB_URL}?key=${newKey}`;

    await ctx.reply(
        `🔄 **ĐÃ TẠO LINK XÁC THỰC MỚI (Lần ${userData.step + 1}/6)!**\n\n` +
        `📌 Hãy bấm vào nút bên dưới để mở trang web vượt link nhé!`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🌐 Mở Web Lấy Key (5s)", url: webRedirectLink }]
                ]
            }
        }
    );
});

// 3. Lệnh /blike - Gửi yêu cầu buff để Admin xác nhận
bot.command('blike', async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    const input = ctx.message.text.split(' ');
    const gameUid = input[1];

    if (!gameUid) {
        return ctx.reply("❌ Vui lòng nhập đúng cú pháp: `/blike <UID_GAME>`", { parse_mode: 'Markdown' });
    }

    if (userData.status !== '🟢') {
        return ctx.reply("🔴 Bạn chưa vượt link! Hãy gõ `/getkey` để hoàn thành vượt link lấy trạng thái xanh trước.");
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
        `📌 Đơn đang chờ Admin kiểm tra. Coin sẽ chỉ bị trừ khi đơn được duyệt thành công!`,
        { parse_mode: 'Markdown' }
    );

    try {
        const adminMessage =
            `🔔 **YÊU CẦU BUFF LIKE CẦN DUYỆT!**\n\n` +
            `👤 Người gửi: ${ctx.from.first_name} (@${ctx.from.username || 'N/A'})\n` +
            `🆔 Telegram ID: \`${userId}\`\n` +
            `🎮 **UID Game:** \`${gameUid}\`\n` +
            `💰 Số dư hiện tại của User: ${userData.coin} Coin\n` +
            `⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}`;
        await bot.telegram.sendMessage(ADMIN_ID, adminMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "✅ Xác Nhận (Trừ 4 Coin)", callback_data: `approve_${buffId}` },
                        { text: "❌ Từ Chối / Lỗi UID", callback_data: `reject_${buffId}` }
                    ]
                ]
            }
        });
    } catch (error) {
        console.error("Lỗi gửi thông báo Admin:", error.message);
    }
});

// ==================== XỬ LÝ DUYỆT ĐƠN CỦA ADMIN ====================

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
        await ctx.editMessageText(`❌ **DUYỆT THẤT BẠI!** User ID \`${buffData.userId}\` không còn đủ 4 coin.`, { parse_mode: 'Markdown' });
        return;
    }

    targetUser.coin -= buffData.requiredCoins;
    buffData.status = 'APPROVED';

    await ctx.editMessageText(
        `✅ **ĐÃ XÁC NHẬN BUFF LIKE THÀNH CÔNG!**\n\n` +
        `🎮 UID Game: \`${buffData.gameUid}\`\n` +
        `👤 User ID: \`${buffData.userId}\`\n` +
        `📉 Đã trừ: **-${buffData.requiredCoins} Coin** (Số dư mới: ${targetUser.coin} Coin)`,
        { parse_mode: 'Markdown' }
    );

    try {
        await bot.telegram.sendMessage(
            buffData.userId,
            `🎉 **YÊU CẦU BUFF LIKE ĐÃ ĐƯỢC DUYỆT!**\n\n` +
            `🎮 UID Game: \`${buffData.gameUid}\`\n` +
            `📦 Gói: **200 Like**\n` +
            `📉 Đã trừ: **-${buffData.requiredCoins} Coin**\n` +
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
        `🎮 UID Game lỗi: \`${buffData.gameUid}\`\n` +
        `👤 User ID: \`${buffData.userId}\`\n` +
        `💡 Không trừ coin của người dùng (Bảo toàn số dư: ${targetUser.coin} Coin).`,
        { parse_mode: 'Markdown' }
    );

    try {
        await bot.telegram.sendMessage(
            buffData.userId,
            `❌ **YÊU CẦU BUFF LIKE BỊ TỪ CHỐI / LỖI UID!**\n\n` +
            `🎮 UID Game: \`${buffData.gameUid}\`\n` +
            `⚠️ Lý do: UID không hợp lệ hoặc gặp sự cố.\n` +
            `💰 Coin của bạn **chưa bị trừ** (Hiện có: **${targetUser.coin}** Coin). Vui lòng kiểm tra lại UID!`,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {}
});

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
        `💰 Tổng Coin hiện tại của user: **${targetUserData.coin}** Coin`,
        { parse_mode: 'Markdown' }
    );
});

bot.launch();
console.log("Bot Telegram chạy 100% JS đã khởi động thành công!");

// Mở cổng web ảo trên Render
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running smooth!\n');
}).listen(PORT, () => {
    console.log(`Web server is listening on port ${PORT}`);
});
