const { Telegraf } = require('telegraf');

const BOT_TOKEN = '9001402578:AAFr0uRt9VnpngXyUTlSsqqchvNtuBqL9GQ'; // Token của bạn
const ADMIN_ID = 7827755950;

const bot = new Telegraf(BOT_TOKEN);

const LINK_RUT_GON = [
    'https://link4m.org/dzhras', // Link 1 của bạn
    'https://linkfree.click/s/key-botz1u19xrmvvo09pl', // Link 2
    'https://link4m.net/dzhras', // Link 3
    'https://linkfree.click/s/key-coinz1u19xrmvvuw05e', // Link 4
    'https://gtraffic.io/FAGWC6Q', // Link 5
    'https://gtraffic.io/Q7Q6t4G'  // Link 6
];

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

// Hàm sinh mã key ngẫu nhiên
function generateKey() {
    return 'KEY-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 1. Lệnh /start tự động bắt payload khi user từ web quay về
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    const payload = ctx.startPayload; // Nhận mã key từ link chuyển hướng về

    // Nếu có payload truyền về khớp với mã đang chờ và chưa quá giới hạn
    if (payload && userData.activeKey && payload === userData.activeKey && userData.step < 6) {
        userData.status = '🟢';
        userData.coin += 1; // Cộng ngay +1 Coin
        userData.activeKey = null; // Xóa key để chống spam
        userData.step += 1; // Tăng tiến trình

        const completedStep = userData.step;
        let nextInfo = completedStep < 6
            ? `💡 *Tiến trình: ${completedStep}/6. Gõ /getkey để lấy link tiếp theo.*`
            : `🎉 **Đã hoàn thành tối đa 6/6 lần trong ngày!**`;

        return ctx.reply(
            `🎉 **CỘNG +1 COIN THÀNH CÔNG (Lần ${completedStep}/6)!**\n\n` +
            `💰 Tổng Coin hiện tại: **${userData.coin}** Coin\n\n` +
            nextInfo,
            { parse_mode: 'Markdown' }
        );
    }

    // Menu mặc định khi bấm /start bình thường
    let menuText =
        `👋 Chào mừng **${ctx.from.first_name}**!\n\n` +
        `📌 Trạng thái: ${userData.status}\n` +
        `📊 Tiến trình: **${userData.step}/6 lần**\n` +
        `💰 Số Coin: **${userData.coin}** Coin\n\n` +
        `📜 Lệnh:\n• \`/getkey\` : Lấy link vượt nhận coin\n• \`/blike <uid>\`: Buff like (4 Coin)`;

    if (userId === ADMIN_ID) {
        menuText += `\n\n👑 Admin: \`/addcoin <id> <số_coin>\``;
    }

    ctx.reply(menuText, { parse_mode: 'Markdown' });
});

// 2. Lệnh /getkey tạo link có đính kèm mã key riêng cho từng người
bot.command('getkey', (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);

    if (userData.step >= 6) {
        return ctx.reply(`⚠️ Bạn đã đạt giới hạn tối đa 6/6 lần trong ngày!`);
    }

    if (!userData.keyCreatedAt) {
        userData.keyCreatedAt = Date.now();
    }

    const currentStep = userData.step;
    const baseLink = LINK_RUT_GON[currentStep];
    const uniqueKey = generateKey();
    userData.activeKey = uniqueKey;

    // QUAN TRỌNG: Gửi link kèm theo mã key để trang rút gọn tự động nối vào
    // Định dạng link gửi cho user sẽ gắn kèm ?key=... hoặc bạn cấu hình ở web rút gọn
    const fullLink = `${baseLink}`;

    ctx.reply(
        `🔗 **LINK LẤY KEY (Lần ${currentStep + 1}/6)**\n\n` +
        `👉 Bấm vào nút bên dưới để vượt link nhận coin tự động:`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🌐 Mở Link Vượt Key", url: fullLink }]
                ]
            }
        }
    );
});

// Các lệnh /blike và Admin giữ nguyên không đổi...
bot.command('blike', async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    const gameUid = ctx.message.text.split(' ')[1];

    if (!gameUid) return ctx.reply("❌ Cú pháp: `/blike <UID_GAME>`", { parse_mode: 'Markdown' });
    if (userData.status !== '🟢') return ctx.reply("🔴 Bạn chưa vượt link! Gõ `/getkey` trước.");
    if (userData.coin < 4) return ctx.reply(`❌ Không đủ 4 Coin (Hiện có: ${userData.coin}).`);

    const buffId = 'BUFF-' + Date.now();
    pendingBuffs.set(buffId, { userId, gameUid, requiredCoins: 4, status: 'PENDING' });

    await ctx.reply(`⏳ Đã gửi yêu cầu buff UID: \`${gameUid}\` tới Admin!`, { parse_mode: 'Markdown' });
    try {
        await bot.telegram.sendMessage(ADMIN_ID,
            `🔔 **DUYỆT BUFF LIKE**\n👤 User ID: \`${userId}\`\n🎮 UID: \`${gameUid}\``,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: "✅ Duyệt (-4 Coin)", callback_data: `approve_${buffId}` },
                        { text: "❌ Từ Chối", callback_data: `reject_${buffId}` }
                    ]]
                }
            }
        );
    } catch (e) {}
});

bot.action(/^approve_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const buffData = pendingBuffs.get(ctx.match[1]);
    if (!buffData || buffData.status !== 'PENDING') return ctx.editMessageText("⚠️ Đơn đã xử lý!");

    const targetUser = getUserData(buffData.userId);
    if (targetUser.coin < 4) return ctx.editMessageText("❌ User không đủ coin.");

    targetUser.coin -= 4;
    buffData.status = 'APPROVED';

    await ctx.editMessageText(`✅ Đã duyệt đơn UID: \`${buffData.gameUid}\``, { parse_mode: 'Markdown' });
    try {
        await bot.telegram.sendMessage(buffData.userId, `🎉 Đơn buff 200 like đã được duyệt! Trừ 4 Coin.`, { parse_mode: 'Markdown' });
    } catch (e) {}
});

bot.action(/^reject_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const buffData = pendingBuffs.get(ctx.match[1]);
    if (!buffData || buffData.status !== 'PENDING') return ctx.editMessageText("⚠️ Đơn đã xử lý!");

    buffData.status = 'REJECTED';
    await ctx.editMessageText(`❌ Đã từ chối đơn buff!`, { parse_mode: 'Markdown' });
    try {
        await bot.telegram.sendMessage(buffData.userId, `❌ Đơn buff like bị từ chối, không trừ coin.`, { parse_mode: 'Markdown' });
    } catch (e) {}
});

bot.command('addcoin', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const input = ctx.message.text.split(' ');
    const targetUserId = parseInt(input[1]);
    const amount = parseInt(input[2]);
    if (!targetUserId || isNaN(amount)) return ctx.reply("❌ Cú pháp: `/addcoin <id> <số_coin>`");

    getUserData(targetUserId).coin += amount;
    ctx.reply(`✅ Đã cộng +${amount} coin cho \`${targetUserId}\`.`, { parse_mode: 'Markdown' });
});

bot.launch();
console.log("Bot running...");
