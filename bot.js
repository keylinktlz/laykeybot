const { Telegraf } = require('telegraf');

// ==================== CẤU HÌNH THÔNG TIN ====================
const BOT_TOKEN = '9001402578:AAFr0uRt9VnpngXyUTlSsqqchvNtuBqL9GQ'; // Token bot từ BotFather
const ADMIN_ID = 7827755950; // ID Admin của bạn

const bot = new Telegraf(BOT_TOKEN);

// Danh sách 6 liên kết rút gọn trong ngày
const LINK_RUT_GON = [
    'https://link4m.org/dzhras', // Lần 1/6
    'https://linkfree.click/s/key-botz1u19xrmvvo09pl', // Lần 2/6
    'https://link4m.net/dzhras', // Lần 3/6
    'https://linkfree.click/s/key-coinz1u19xrmvvuw05e', // Lần 4/6
    'https://gtraffic.io/FAGWC6Q', // Lần 5/6
    'https://gtraffic.io/Q7Q6t4G'  // Lần 6/6
];

const users = new Map();
const pendingBuffs = new Map();

function getUserData(userId) {
    if (!users.has(userId)) {
        users.set(userId, {
            coin: 0,
            status: '🔴',
            isWaitingLink: false,
            keyCreatedAt: null,
            step: 0
        });
    }
    const data = users.get(userId);

    // Reset sau 24h
    if (data.keyCreatedAt && (Date.now() - data.keyCreatedAt > 24 * 60 * 60 * 1000)) {
        data.status = '🔴';
        data.isWaitingLink = false;
        data.keyCreatedAt = null;
        data.step: 0; // Chỗ này để nguyên logic của mày
    }
    return data;
}

// ==================== XỬ LÝ LỆNH BOT ====================

// 1. Lệnh /start (Nhận diện user vừa từ link vượt trở về)
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);

    // Nếu user vừa bấm /getkey xong và quay lại từ link rút gọn
    if (userData.isWaitingLink) {
        if (userData.step < 6) {
            userData.status = '🟢';
            userData.coin += 1; // Cộng 1 Coin
            userData.step += 1; // Tăng 1 lần vượt
            userData.isWaitingLink = false; // Tắt trạng thái chờ

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
        }
    }

    // Giao diện Menu mặc định
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

// 2. Lệnh /getkey
bot.command('getkey', (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    const userName = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

    if (userData.step >= 6) {
        return ctx.reply(
            `⚠️ **BẠN ĐÃ ĐẠT GIỚI HẠN TỐI ĐA (6/6 LẦN TRONG NGÀY)!**\n\n` +
            `⏳ Vui lòng quay lại sau 24h kể từ lần làm đầu tiên để tiếp tục!`,
            { parse_mode: 'Markdown' }
        );
    }

    if (!userData.keyCreatedAt) {
        userData.keyCreatedAt = Date.now();
    }

    userData.isWaitingLink = true; // Đánh dấu user đang bắt đầu vượt link
    const currentStep = userData.step;
    const currentLink = LINK_RUT_GON[currentStep];

    const message = 
        `🔗 **LINK LẤY KEY NHẬN COIN (Lần ${currentStep + 1}/6)**\n\n` +
        `👉 **Tài khoản:** ${userName}\n` +
        `👉 **Link của bạn:** ${currentLink}\n\n` +
        `⚠️ **Lưu ý:** Sau khi vượt link xong, hệ thống sẽ tự động chuyển về Telegram và cộng **+1 Coin**.`;

    ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: "🌐 Mở Link Vượt Key", url: currentLink }]
            ]
        }
    });
});

// 3. Lệnh /blike
bot.command('blike', async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    const input = ctx.message.text.split(' ');
    const gameUid = input[1];

    if (!gameUid) return ctx.reply("❌ Cú pháp: `/blike <UID_GAME>`", { parse_mode: 'Markdown' });
    if (userData.status !== '🟢') return ctx.reply("🔴 Bạn chưa vượt link! Hãy gõ `/getkey` trước.");
    if (userData.coin < 4) return ctx.reply(`❌ Bạn không đủ 4 Coin (Hiện có: ${userData.coin} Coin).`);

    const buffId = 'BUFF-' + Date.now();
    pendingBuffs.set(buffId, { userId, gameUid, requiredCoins: 4, status: 'PENDING' });

    await ctx.reply(`⏳ **ĐÃ GỬI YÊU CẦU BUFF LIKE TỚI ADMIN!**\n🎮 UID Game: \`${gameUid}\``, { parse_mode: 'Markdown' });

    try {
        await bot.telegram.sendMessage(ADMIN_ID, 
            `🔔 **YÊU CẦU BUFF LIKE CẦN DUYỆT!**\n👤 User: ${ctx.from.first_name}\n🆔 ID: \`${userId}\`\n🎮 **UID Game:** \`${gameUid}\``, 
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

// Duyệt đơn Admin
bot.action(/^approve_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const buffData = pendingBuffs.get(ctx.match[1]);
    if (!buffData || buffData.status !== 'PENDING') return ctx.editMessageText("⚠️ Đơn đã xử lý!");

    const targetUser = getUserData(buffData.userId);
    if (targetUser.coin < 4) return ctx.editMessageText("❌ User không đủ coin.");

    targetUser.coin -= 4;
    buffData.status = 'APPROVED';

    await ctx.editMessageText(`✅ **ĐÃ DUYỆT BUFF LIKE!**\n🎮 UID: \`${buffData.gameUid}\``, { parse_mode: 'Markdown' });
    try {
        await bot.telegram.sendMessage(buffData.userId, `🎉 **ĐƠN BUFF LIKE ĐÃ ĐƯỢC DUYỆT!**\n📉 Trừ: 4 Coin.`, { parse_mode: 'Markdown' });
    } catch (e) {}
});

bot.action(/^reject_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (ctx.from.id !== ADMIN_ID) return;
    const buffData = pendingBuffs.get(ctx.match[1]);
    if (!buffData || buffData.status !== 'PENDING') return ctx.editMessageText("⚠️ Đơn đã xử lý!");

    buffData.status = 'REJECTED';
    await ctx.editMessageText(`❌ **ĐÃ TỪ CHỐI ĐƠN BUFF!**`, { parse_mode: 'Markdown' });
    try {
        await bot.telegram.sendMessage(buffData.userId, `❌ **YÊU CẦU BUFF LIKE BỊ TỪ CHỐI!** Coin không bị trừ.`, { parse_mode: 'Markdown' });
    } catch (e) {}
});

bot.command('addcoin', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const input = ctx.message.text.split(' ');
    const targetUserId = parseInt(input[1]);
    const amount = parseInt(input[2]);
    if (!targetUserId || isNaN(amount)) return ctx.reply("❌ Cú pháp: `/addcoin <id> <số_coin>`");

    const targetUserData = getUserData(targetUserId);
    targetUserData.coin += amount;
    ctx.reply(`✅ Đã thêm **+${amount} Coin** cho ID \`${targetUserId}\`.`, { parse_mode: 'Markdown' });
});

bot.launch();
console.log("Bot running...");
