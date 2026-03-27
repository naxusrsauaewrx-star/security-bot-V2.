const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField, 
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const TopupSystem = require('./nightshopwallet.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

const TOKEN = 'MTQ2MjY1NzUxMzQ2MjgyOTIxMg.G_BB95.h-9iMTBElRWdJnPMpt4bwP2T5UhKJySxBfRtII';
const DATA_DIR = path.join(__dirname, 'nightshop', 'guid');
const PREMIUM_DATA_PATH = path.join(__dirname, 'nightshoppremium', 'savepremium.json');
const PREMIUM_COMMANDS_PATH = path.join(__dirname, 'nightshoppremium', 'premium.json');
const USER_MONEY_PATH = path.join(__dirname, 'nightshop', 'user_money.json');
const PREMIUM_EXPIRY_PATH = path.join(__dirname, 'nightshop', 'premium_expiry.json');
const CONFIG_PATH = path.join(__dirname, 'nightconfig.json');

if (!fs.existsSync(path.join(__dirname, 'nightshoppremium'))) {
    fs.mkdirSync(path.join(__dirname, 'nightshoppremium'), { recursive: true });
}
if (!fs.existsSync(path.join(__dirname, 'nightshop'))) {
    fs.mkdirSync(path.join(__dirname, 'nightshop'), { recursive: true });
}

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        const defaultConfig = {
            TOKEN_BOT: TOKEN,
            PHONE_NUMBER: "0899999999",
            CHANNEL_NOTIFY_TOPUP: "1328004426912370709",
            CHANNEL_NOTIFY_PURCHASE: "1328004426912370709",
            CHANNEL_NOTIFY_EXPIRE: "1328004426912370709",
            PREMIUM_PRICES: {
                "7": 30,
                "30": 150
            }
        };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 4));
        return defaultConfig;
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

const config = loadConfig();

const topupSystem = new TopupSystem({
    phoneNumber: config.PHONE_NUMBER,
    databasePath: USER_MONEY_PATH,
    timeout: 30000
});

function getServerData(guildId) {
    const filePath = path.join(DATA_DIR, `${guildId}.json`);
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    
    if (!fs.existsSync(filePath)) {
        const defaultData = {
            protection_level: 1,
            antilink: false,
            antispam: false,
            antinuke: false,
            antiinvite: false,
            antibadwords: true,
            badwords: [],
            whitelist_users: [],
            whitelist_channels: [],
            whitelist_roles: [],
            premium_commands: [], 
            log_channels: {
                antispam: null,
                antilink: null,
                antinuke: null,
                antiinvite: null,
                antibadwords: null,
                joingate: null,
                moderation: null
            }
        };
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 4));
        return defaultData;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath));
    

    if (!data.premium_commands) {
        data.premium_commands = [];
    }
    
 
    if (!data.log_channels) {
        data.log_channels = {
            antispam: null,
            antilink: null,
            antinuke: null,
            antiinvite: null,
            antibadwords: null,
            joingate: null,
            moderation: null
        };
    } else {

        const defaultLogChannels = {
            antispam: null,
            antilink: null,
            antinuke: null,
            antiinvite: null,
            antibadwords: null,
            joingate: null,
            moderation: null
        };
        
        for (const key in defaultLogChannels) {
            if (!data.log_channels.hasOwnProperty(key)) {
                data.log_channels[key] = defaultLogChannels[key];
            }
        }
    }
    

    if (typeof data.protection_level === 'undefined') data.protection_level = 1;
    if (typeof data.antilink === 'undefined') data.antilink = false;
    if (typeof data.antispam === 'undefined') data.antispam = false;
    if (typeof data.antinuke === 'undefined') data.antinuke = false;
    if (typeof data.antiinvite === 'undefined') data.antiinvite = false;
    if (typeof data.antibadwords === 'undefined') data.antibadwords = true;
    if (!data.badwords) data.badwords = [];
    if (!data.whitelist_users) data.whitelist_users = [];
    if (!data.whitelist_channels) data.whitelist_channels = [];
    if (!data.whitelist_roles) data.whitelist_roles = [];
    
    return data;
}

function saveServerData(guildId, data) {
    const filePath = path.join(DATA_DIR, `${guildId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}


function getPremiumCommands() {
    if (!fs.existsSync(PREMIUM_COMMANDS_PATH)) {
        fs.writeFileSync(PREMIUM_COMMANDS_PATH, JSON.stringify([], null, 4));
        return [];
    }
    return JSON.parse(fs.readFileSync(PREMIUM_COMMANDS_PATH));
}


function savePremiumCommands(commands) {
    fs.writeFileSync(PREMIUM_COMMANDS_PATH, JSON.stringify(commands, null, 4));
}


function getPremiumGuilds() {
    if (!fs.existsSync(PREMIUM_DATA_PATH)) {
        fs.writeFileSync(PREMIUM_DATA_PATH, JSON.stringify([], null, 4));
        return [];
    }
    return JSON.parse(fs.readFileSync(PREMIUM_DATA_PATH));
}


function savePremiumGuilds(guilds) {
    fs.writeFileSync(PREMIUM_DATA_PATH, JSON.stringify(guilds, null, 4));
}


function isPremiumGuild(guildId) {

    const isExpired = checkPremiumExpiry(guildId);
    if (!isExpired) return false;
    

    const premiumGuilds = getPremiumGuilds();
    return premiumGuilds.includes(guildId);
}


function addPremiumGuild(guildId) {
    const premiumGuilds = getPremiumGuilds();
    if (!premiumGuilds.includes(guildId)) {
        premiumGuilds.push(guildId);
        savePremiumGuilds(premiumGuilds);
    }
    return true;
}


function removePremiumGuild(guildId) {
    const premiumGuilds = getPremiumGuilds();
    const index = premiumGuilds.indexOf(guildId);
    if (index > -1) {
        premiumGuilds.splice(index, 1);
        savePremiumGuilds(premiumGuilds);
    }
    return true;
}

function loadPremiumCommandsForGuild(guildId) {
    const serverData = getServerData(guildId);
    const premiumCommands = getPremiumCommands();

    premiumCommands.forEach(command => {
        if (!serverData.premium_commands.includes(command)) {
            serverData.premium_commands.push(command);
        }
    });
    
    saveServerData(guildId, serverData);
    return serverData;
}

async function getUserMoney(userId) {
    try {
        if (!fs.existsSync(USER_MONEY_PATH)) {
            fs.writeFileSync(USER_MONEY_PATH, JSON.stringify({}, null, 4));
            return { point: 0, pointall: 0 };
        }
        const userData = JSON.parse(fs.readFileSync(USER_MONEY_PATH, 'utf8'));
        return userData[userId] || { point: 0, pointall: 0 };
    } catch (error) {
        console.error('Error loading user money:', error);
        return { point: 0, pointall: 0 };
    }
}

async function updateUserMoney(userId, amount) {
    try {
        let userData = {};
        if (fs.existsSync(USER_MONEY_PATH)) {
            userData = JSON.parse(fs.readFileSync(USER_MONEY_PATH, 'utf8'));
        }
        
        if (!userData[userId]) {
            userData[userId] = { point: 0, pointall: 0 };
        }
        
        userData[userId].point += amount;
        if (amount > 0) {
            userData[userId].pointall += amount;
        }
        
        fs.writeFileSync(USER_MONEY_PATH, JSON.stringify(userData, null, 4));
        return userData[userId];
    } catch (error) {
        console.error('Error updating user money:', error);
        throw error;
    }
}

function getPremiumExpiryData() {
    if (!fs.existsSync(PREMIUM_EXPIRY_PATH)) {
        fs.writeFileSync(PREMIUM_EXPIRY_PATH, JSON.stringify({}, null, 4));
        return {};
    }
    return JSON.parse(fs.readFileSync(PREMIUM_EXPIRY_PATH, 'utf8'));
}

function savePremiumExpiryData(data) {
    fs.writeFileSync(PREMIUM_EXPIRY_PATH, JSON.stringify(data, null, 4));
}

function checkPremiumExpiry(guildId) {
    const expiryData = getPremiumExpiryData();
    
    if (!expiryData[guildId]) return false;
    
    const expiryTime = expiryData[guildId].expiry;
    const now = Date.now();
    
    if (now > expiryTime) {

        removePremiumGuild(guildId);
        delete expiryData[guildId];
        savePremiumExpiryData(expiryData);

        notifyPremiumExpiry(guildId);
        return false;
    }
    
    return true;
}

async function notifyPremiumExpiry(guildId) {
    try {
        const channelId = config.CHANNEL_NOTIFY_EXPIRE;
        if (!channelId) return;
        
        const channel = client.channels.cache.get(channelId);
        if (!channel) return;
        
        const embed = new EmbedBuilder()
            .setTitle('⚠️ พรีเมี่ยมหมดอายุแล้ว')
            .setColor('#ff9900')
            .setDescription(`\`\`\`diff\n- พรีเมี่ยมเซิร์ฟเวอร์ ID: ${guildId} หมดอายุแล้ว\n\`\`\``)
            .addFields(
                { name: '📊 สถานะ', value: '❌ เซิร์ฟเวอร์นี้ไม่สามารถใช้งานคำสั่ง Premium ได้แล้ว', inline: false },
                { name: '🕒 เวลา', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: '⭐ Premium System', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error notifying expiry:', error);
    }
}


async function notifyPurchase(userId, guildId, days, price) {
    try {
        const channelId = config.CHANNEL_NOTIFY_PURCHASE;
        if (!channelId) return;
        
        const channel = client.channels.cache.get(channelId);
        if (!channel) return;
        
        const embed = new EmbedBuilder()
            .setTitle('✅ ซื้อพรีเมี่ยมสำเร็จ')
            .setColor('#00ff00')
            .setDescription(`\`\`\`diff\n+ ผู้ใช้ซื้อพรีเมี่ยม ${days} วัน\n\`\`\``)
            .addFields(
                { name: '👤 ผู้ซื้อ', value: `<@${userId}> (ID: ${userId})`, inline: true },
                { name: '🏠 เซิร์ฟเวอร์', value: `ID: ${guildId}`, inline: true },
                { name: '📅 ระยะเวลา', value: `${days} วัน`, inline: true },
                { name: '💰 ราคา', value: `${price} บาท`, inline: true },
                { name: '🕒 เวลา', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: '⭐ Premium System', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error notifying purchase:', error);
    }
}

async function notifyTopup(userId, amount, ownerName) {
    try {
        const channelId = config.CHANNEL_NOTIFY_TOPUP;
        if (!channelId) return;
        
        const channel = client.channels.cache.get(channelId);
        if (!channel) return;
        
        const embed = new EmbedBuilder()
            .setTitle('💰 การเติมเงินใหม่')
            .setColor('#00ff00')
            .setDescription('มีผู้ใช้เติมเงินเข้าระบบ')
            .addFields(
                { name: '👤 ผู้ใช้', value: `<@${userId}> (ID: ${userId})`, inline: true },
                { name: '💰 จำนวน', value: `${amount} บาท`, inline: true },
                { name: '📋 ผู้ส่งเงิน', value: ownerName || 'ไม่ทราบชื่อ', inline: true },
                { name: '🕒 เวลา', value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true }
            )
            .setFooter({ text: '💰 Wallet System', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error sending topup notification:', error);
    }
}

const spamDetectors = {
    rapidFire: new Map(),
    duplicate: new Map(),
    flood: new Map(),
    shortSpam: new Map()
};

function checkSpam(message, data) {
    if (!data.antispam) return null;
    
    const userId = message.author.id;
    const content = message.content;
    const now = Date.now();

    if (!spamDetectors.rapidFire.has(userId)) {
        spamDetectors.rapidFire.set(userId, []);
    }
    
    const rapidLog = spamDetectors.rapidFire.get(userId);
    rapidLog.push(now);

    const recentRapid = rapidLog.filter(time => now - time < 2000);
    spamDetectors.rapidFire.set(userId, recentRapid);
    

    if (recentRapid.length >= 3) {

        const oneSecondCount = rapidLog.filter(time => now - time < 1000).length;
        if (oneSecondCount >= 3) {
            return { type: 'rapid_fire', count: oneSecondCount, timeframe: '1 วินาที' };
        }
        return { type: 'rapid_fire', count: recentRapid.length, timeframe: '2 วินาที' };
    }


    if (!spamDetectors.duplicate.has(userId)) {
        spamDetectors.duplicate.set(userId, { lastMessage: '', count: 0, lastTime: 0 });
    }
    
    const duplicateData = spamDetectors.duplicate.get(userId);
    
    if (content === duplicateData.lastMessage && now - duplicateData.lastTime < 5000) {
        duplicateData.count++;
        duplicateData.lastTime = now;
    } else {
        duplicateData.lastMessage = content;
        duplicateData.count = 1;
        duplicateData.lastTime = now;
    }
    
    if (duplicateData.count >= 3) {
        return { type: 'duplicate', count: duplicateData.count, message: content };
    }
    

    if (content.length > 30) {
        const upperCase = (content.match(/[A-Zก-ฮ]/g) || []).length;
        const upperRatio = upperCase / content.length;
        
        if (upperRatio > 0.7) {
            return { type: 'caps_flood', ratio: Math.round(upperRatio * 100) };
        }


        const words = content.split(/\s+/);
        if (words.length > 5) {
            const wordCount = {};
            words.forEach(word => {
                const cleanWord = word.toLowerCase().replace(/[^\wก-๙]/g, '');
                if (cleanWord.length > 2) {
                    wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
                }
            });
            
            const repeatedWords = Object.entries(wordCount).filter(([_, count]) => count > 3);
            if (repeatedWords.length > 0) {
                return { type: 'word_flood', words: repeatedWords.map(([word]) => word) };
            }
        }
    }


    if (content.length < 15 && content.length > 2) {
        if (!spamDetectors.shortSpam.has(userId)) {
            spamDetectors.shortSpam.set(userId, []);
        }
        
        const shortLog = spamDetectors.shortSpam.get(userId);
        shortLog.push({ content, time: now });

        const recentShort = shortLog.filter(item => now - item.time < 3000);
        spamDetectors.shortSpam.set(userId, recentShort);

        if (recentShort.length >= 4) {
            const uniqueContents = [...new Set(recentShort.map(item => item.content))];
            if (uniqueContents.length <= 2) {
                return { type: 'short_spam', count: recentShort.length, unique: uniqueContents.length };
            }
        }
    }
    
    return null;
}

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    
    const commands = [
        {
            name: 'setup',
            description: '📊 ตั้งค่าระบบป้องกันทั้งหมด',
            options: [{ 
                name: 'mode', 
                description: 'เลือกโหมดการตั้งค่า', 
                type: 3, 
                required: true, 
                choices: [
                    { name: 'All (สร้างช่อง Logs อัตโนมัติ)', value: 'all' }, 
                    { name: 'Config (ปรับแต่งระดับ)', value: 'config' }
                ] 
            }]
        },
        {
            name: 'dashboard',
            description: '📱 แสดงแผงควบคุมระบบ'
        },
        {
            name: 'anti-link',
            description: '🔗 เปิด/ปิด ระบบกันลิงก์',
            options: [{ name: 'status', description: 'เลือก เปิด หรือ ปิด', type: 5, required: true }]
        },
        {
            name: 'anti-invite',
            description: '🎫 เปิด/ปิด ระบบกันลิงก์เชิญ',
            options: [{ name: 'status', description: 'เลือก เปิด หรือ ปิด', type: 5, required: true }]
        },
        {
            name: 'anti-nuke',
            description: '💣 เปิด/ปิด ระบบกันยิงดิส',
            options: [{ name: 'status', description: 'เลือก เปิด หรือ ปิด', type: 5, required: true }]
        },
        {
            name: 'anti-spam',
            description: '🚫 เปิด/ปิด ระบบกันสแปม',
            options: [{ name: 'status', description: 'เลือก เปิด หรือ ปิด', type: 5, required: true }]
        },
        {
            name: 'banchat',
            description: '⚡ บันทึกคำไม่เหมาะสม',
            options: [
                { 
                    name: 'word', 
                    description: 'คำที่ไม่ต้องการให้ใช้', 
                    type: 3, 
                    required: true 
                }
            ]
        },
        {
            name: 'unbanchatall',
            description: '🧹 ลบคำไม่เหมาะสมทั้งหมด'
        },
        {
            name: 'badwords-list',
            description: '📜 แสดงรายการคำไม่เหมาะสม'
        },
        {
            name: 'whitelist',
            description: '👑 จัดการรายชื่อยกเว้น',
            options: [
                { 
                    name: 'add_member', 
                    description: 'เพิ่มสมาชิกเข้า whitelist', 
                    type: 1, 
                    options: [{ name: 'user', description: 'สมาชิกที่ต้องการเพิ่ม', type: 6, required: true }] 
                },
                { 
                    name: 'add_channel', 
                    description: 'เพิ่มช่องเข้า whitelist', 
                    type: 1, 
                    options: [{ name: 'channel', description: 'ช่องที่ต้องการเพิ่ม', type: 7, required: true }] 
                },
                { 
                    name: 'add_role', 
                    description: 'เพิ่มบทบาทเข้า whitelist', 
                    type: 1, 
                    options: [{ name: 'role', description: 'บทบาทที่ต้องการเพิ่ม', type: 8, required: true }] 
                },
                { 
                    name: 'remove_all', 
                    description: 'ล้างรายการ whitelist ทั้งหมด', 
                    type: 1 
                }
            ]
        },
        {
            name: 'log-channel',
            description: '📝 ตั้งค่าช่องสำหรับบันทึก',
            options: [
                {
                    name: 'type',
                    description: 'ประเภทของบันทึก',
                    type: 3,
                    required: true,
                    choices: [
                        { name: 'Anti-Spam', value: 'antispam' },
                        { name: 'Anti-Link', value: 'antilink' },
                        { name: 'Anti-Nuke', value: 'antinuke' },
                        { name: 'Anti-Invite', value: 'antiinvite' },
                        { name: 'Anti-Badwords', value: 'antibadwords' },
                        { name: 'Join Gate', value: 'joingate' },
                        { name: 'Moderation', value: 'moderation' }
                    ]
                },
                {
                    name: 'channel',
                    description: 'ช่องที่ต้องการใช้',
                    type: 7,
                    required: true
                }
            ]
        },
        {
            name: 'kick',
            description: '👢 เตะสมาชิกออกจากเซิร์ฟเวอร์',
            options: [
                { name: 'member', description: 'สมาชิกที่ต้องการเตะ', type: 6, required: true }, 
                { name: 'reason', description: 'เหตุผลในการเตะ', type: 3, required: false }
            ]
        },
        {
            name: 'ban',
            description: '🔨 แบนสมาชิกออกจากเซิร์ฟเวอร์',
            options: [
                { name: 'member', description: 'สมาชิกที่ต้องการแบน', type: 6, required: true }, 
                { name: 'reason', description: 'เหตุผลในการแบน', type: 3, required: false }
            ]
        },
        {
            name: 'info',
            description: 'ℹ️ ดูข้อมูลการตั้งค่าความปลอดภัยปัจจุบัน'
        },
        {
            name: 'premium',
            description: '⭐ จัดการคำสั่ง Premium',
            options: [
                {
                    name: 'command',
                    description: 'เลือกคำสั่งที่ต้องการตั้งค่าเป็น Premium',
                    type: 3,
                    required: true,
                    choices: [
                        { name: 'Anti-Link', value: 'anti-link' },
                        { name: 'Anti-Invite', value: 'anti-invite' },
                        { name: 'Anti-Nuke', value: 'anti-nuke' },
                        { name: 'Anti-Spam', value: 'anti-spam' },
                        { name: 'Setup', value: 'setup' },
                        { name: 'Dashboard', value: 'dashboard' },
                        { name: 'Kick', value: 'kick' },
                        { name: 'Ban', value: 'ban' },
                        { name: 'Info', value: 'info' }
                    ]
                }
            ]
        },
        {
            name: 'unpremium',
            description: '❌ ถอดคำสั่งออกจากระบบ Premium',
            options: [
                {
                    name: 'command',
                    description: 'เลือกคำสั่งที่ต้องการถอดจาก Premium',
                    type: 3,
                    required: true,
                    choices: [
                        { name: 'Anti-Link', value: 'anti-link' },
                        { name: 'Anti-Invite', value: 'anti-invite' },
                        { name: 'Anti-Nuke', value: 'anti-nuke' },
                        { name: 'Anti-Spam', value: 'anti-spam' },
                        { name: 'Setup', value: 'setup' },
                        { name: 'Dashboard', value: 'dashboard' },
                        { name: 'Kick', value: 'kick' },
                        { name: 'Ban', value: 'ban' },
                        { name: 'Info', value: 'info' }
                    ]
                }
            ]
        },
        {
            name: 'addpremium',
            description: '🌟 เพิ่ม Premium ให้กับเซิร์ฟเวอร์',
            options: [
                {
                    name: 'guild_id',
                    description: 'ID ของเซิร์ฟเวอร์ที่ต้องการเพิ่ม Premium',
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: 'deletepremium',
            description: '🗑️ ลบ Premium ออกจากเซิร์ฟเวอร์',
            options: [
                {
                    name: 'guild_id',
                    description: 'ID ของเซิร์ฟเวอร์ที่ต้องการลบ Premium',
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: 'checkpremium',
            description: '🔍 ตรวจสอบสถานะพรีเมี่ยม',
            options: [
                {
                    name: 'guild_id',
                    description: 'ID ของเซิร์ฟเวอร์ที่ต้องการตรวจสอบ (ไม่ใส่ = เซิร์ฟเวอร์ปัจจุบัน)',
                    type: 3,
                    required: false
                }
            ]
        },
        {
            name: 'เช็คยอดเงิน',
            description: '💰 ตรวจสอบยอดเงินในบัญชี'
        },
        {
            name: 'รายละเอียดพรีเมี่ยม',
            description: '⭐ ดูรายละเอียดและราคาพรีเมี่ยม'
        },
        {
            name: 'ซื้อพรีเมี่ยม',
            description: '🛒 ซื้อพรีเมี่ยมให้เซิร์ฟเวอร์',
            options: [
                {
                    name: 'จำนวนวัน',
                    description: 'เลือกจำนวนวันที่ต้องการซื้อ',
                    type: 3,
                    required: true,
                    choices: [
                        { name: '7 วัน (30 บาท)', value: '7' },
                        { name: '30 วัน (150 บาท)', value: '30' }
                    ]
                }
            ]
        },
        {
            name: 'เติมเงิน',
            description: '💳 เติมเงินเข้าระบบด้วย TrueMoney Gift',
            options: [
                {
                    name: 'ลิงก์อั่งเปา',
                    description: 'วางลิงก์อั่งเปา TrueMoney',
                    type: 3,
                    required: true
                }
            ]
        }
    ];

    try {
        await client.application.commands.set(commands);
        console.log('✅ Successfully registered application commands.');
        

        setInterval(() => {
            checkAllPremiumExpiry();
        }, 60 * 60 * 1000); 
        

        checkAllPremiumExpiry();
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
});


function checkAllPremiumExpiry() {
    const expiryData = getPremiumExpiryData();
    const now = Date.now();
    
    for (const guildId in expiryData) {
        if (now > expiryData[guildId].expiry) {
            removePremiumGuild(guildId);
            delete expiryData[guildId];
            savePremiumExpiryData(expiryData);
            notifyPremiumExpiry(guildId);
        }
    }
}

client.on('guildCreate', async guild => {
    console.log(`📥 Joined new guild: ${guild.name} (${guild.id})`);

    loadPremiumCommandsForGuild(guild.id);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu() && !interaction.isButton()) return;

    const guildId = interaction.guildId;
    let serverData = getServerData(guildId);


    const checkPremiumAccess = (commandName) => {

        const premiumCommands = getPremiumCommands();
        

        if (premiumCommands.includes(commandName) && !isPremiumGuild(guildId)) {
            return false;
        }
        return true;
    };

    const sendNoPremiumMessage = async (commandName) => {
        try {
            const embed = new EmbedBuilder()
                .setTitle('❌ ไม่สามารถใช้งานคำสั่งนี้ได้')
                .setDescription(`\`\`\`diff\n- คำสั่ง /${commandName} เป็นคำสั่ง Premium\n\`\`\``)
                .addFields(
                    { name: '📝 รายละเอียด', value: `เซิร์ฟเวอร์ของคุณ (ID: \`${guildId}\`) ไม่มี Premium สำหรับคำสั่งนี้`, inline: false },
                    { name: '💡 วิธีแก้ไข', value: 'ติดต่อผู้ดูแลระบบเพื่อเพิ่ม Premium ให้กับเซิร์ฟเวอร์ของคุณ', inline: false }
                )
                .setColor('#ff0000')
                .setFooter({ text: '⭐ Premium System', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [embed], flags: 64 });
            } else {
                await interaction.reply({ embeds: [embed], flags: 64 });
            }
        } catch (error) {
            console.error('Error sending premium message:', error);
        }
    };

    if (interaction.isChatInputCommand()) {
        const { commandName, options } = interaction;


        if (commandName === 'premium') {
            try {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return await interaction.reply({ 
                        content: '❌ คุณต้องมีสิทธิ์ Administrator เพื่อใช้คำสั่งนี้',
                        flags: 64
                    });
                }


                await interaction.deferReply();

                const command = options.getString('command');
                const premiumCommands = getPremiumCommands();
                
                if (!premiumCommands.includes(command)) {
                    premiumCommands.push(command);
                    savePremiumCommands(premiumCommands);

                    const allGuilds = client.guilds.cache;
                    allGuilds.forEach(guild => {
                        const guildData = getServerData(guild.id);
                        if (!guildData.premium_commands.includes(command)) {
                            guildData.premium_commands.push(command);
                            saveServerData(guild.id, guildData);
                        }
                    });
                    
                    const embed = new EmbedBuilder()
                        .setTitle('⭐ ตั้งค่า Premium เรียบร้อย')
                        .setDescription(`\`\`\`diff\n+ คำสั่ง /${command} ถูกตั้งค่าเป็น Premium ในทุกเซิร์ฟเวอร์\n\`\`\``)
                        .addFields(
                            { name: '📊 สถานะ', value: '✅ คำสั่งนี้จะใช้งานได้เฉพาะเซิร์ฟเวอร์ที่มี Premium', inline: false },
                            { name: 'ℹ️ หมายเหตุ', value: `เซิร์ฟเวอร์ของคุณ ${isPremiumGuild(guildId) ? 'มี Premium ✅' : 'ไม่มี Premium ❌'}`, inline: false },
                            { name: '📝 คำสั่ง Premium ทั้งหมด', value: premiumCommands.map(cmd => `\`/${cmd}\``).join(', ') || 'ไม่มี', inline: false }
                        )
                        .setColor('#ffcc00')
                        .setFooter({ text: '⭐ Premium System', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp()
                        .setThumbnail('https://cdn.discordapp.com/emojis/851270166558343189.gif?size=96&quality=lossless');
                    
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.editReply({ 
                        content: `❌ คำสั่ง /${command} ถูกตั้งค่าเป็น Premium อยู่แล้ว!`
                    });
                }
            } catch (error) {
                console.error('Error in premium command:', error);
                try {
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply({ 
                            content: '❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง',
                            flags: 64
                        });
                    } else {
                        await interaction.reply({ 
                            content: '❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง',
                            flags: 64
                        });
                    }
                } catch (e) {
                    console.error('Error sending error message:', e);
                }
            }
            return;
        }

        if (commandName === 'unpremium') {
            try {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return await interaction.reply({ 
                        content: '❌ คุณต้องมีสิทธิ์ Administrator เพื่อใช้คำสั่งนี้',
                        flags: 64
                    });
                }

                await interaction.deferReply();

                const command = options.getString('command');
                const premiumCommands = getPremiumCommands();
                
                const index = premiumCommands.indexOf(command);
                if (index > -1) {
                    premiumCommands.splice(index, 1);
                    savePremiumCommands(premiumCommands);

                    const allGuilds = client.guilds.cache;
                    allGuilds.forEach(guild => {
                        const guildData = getServerData(guild.id);
                        const cmdIndex = guildData.premium_commands.indexOf(command);
                        if (cmdIndex > -1) {
                            guildData.premium_commands.splice(cmdIndex, 1);
                            saveServerData(guild.id, guildData);
                        }
                    });
                    
                    const embed = new EmbedBuilder()
                        .setTitle('✅ ถอด Premium เรียบร้อย')
                        .setDescription(`\`\`\`diff\n- คำสั่ง /${command} ถูกถอดออกจากระบบ Premium ในทุกเซิร์ฟเวอร์\n\`\`\``)
                        .addFields(
                            { name: '📊 สถานะ', value: '✅ คำสั่งนี้สามารถใช้งานได้โดยทุกคนแล้ว', inline: false },
                            { name: '📝 คำสั่ง Premium ที่เหลือ', value: premiumCommands.map(cmd => `\`/${cmd}\``).join(', ') || 'ไม่มี', inline: false }
                        )
                        .setColor('#00ff00')
                        .setFooter({ text: '⭐ Premium System', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.editReply({ 
                        content: `❌ คำสั่ง /${command} ไม่ได้ถูกตั้งค่าเป็น Premium!`
                    });
                }
            } catch (error) {
                console.error('Error in unpremium command:', error);
                try {
                    await interaction.editReply({ 
                        content: '❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง',
                        flags: 64
                    });
                } catch (e) {
                    console.error('Error sending error message:', e);
                }
            }
            return;
        }

        if (commandName === 'addpremium') {
            try {
                if (interaction.user.id !== '1328004426912370709') { 
                    return await interaction.reply({ 
                        content: '❌ เฉพาะผู้พัฒนาสามารถใช้คำสั่งนี้ได้',
                        flags: 64
                    });
                }

                await interaction.deferReply();

                const guildIdToAdd = options.getString('guild_id');
                
                // ตั้งค่า expiry เป็นอนาคตไกลๆ (10 ปี)
                const expiryTime = Date.now() + (3650 * 24 * 60 * 60 * 1000);
                
                const expiryData = getPremiumExpiryData();
                expiryData[guildIdToAdd] = {
                    userId: interaction.user.id,
                    purchaseDate: Date.now(),
                    expiry: expiryTime,
                    days: 3650,
                    price: 0
                };
                savePremiumExpiryData(expiryData);
                
                // เพิ่มในรายการ premium guilds
                if (addPremiumGuild(guildIdToAdd)) {
                    // โหลด premium commands สำหรับเซิร์ฟเวอร์นี้
                    const guildData = getServerData(guildIdToAdd);
                    const premiumCommands = getPremiumCommands();

                    premiumCommands.forEach(command => {
                        if (!guildData.premium_commands.includes(command)) {
                            guildData.premium_commands.push(command);
                        }
                    });
                    
                    saveServerData(guildIdToAdd, guildData);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🌟 เพิ่ม Premium เรียบร้อย')
                        .setDescription(`\`\`\`diff\n+ เพิ่ม Premium ให้กับเซิร์ฟเวอร์ ID: ${guildIdToAdd}\n+ เป็นเวลา: 3650 วัน (ถาวร)\n\`\`\``)
                        .addFields(
                            { name: '📊 สถานะ', value: '✅ เซิร์ฟเวอร์นี้สามารถใช้งานคำสั่ง Premium ได้ทั้งหมด', inline: false },
                            { name: '📝 คำสั่ง Premium', value: premiumCommands.map(cmd => `\`/${cmd}\``).join(', ') || 'ไม่มี', inline: false },
                            { name: '⏰ วันหมดอายุ', value: `<t:${Math.floor(expiryTime / 1000)}:F>`, inline: false }
                        )
                        .setColor('#00ff00')
                        .setFooter({ text: '⭐ Premium System', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp()
                        .setThumbnail('https://cdn.discordapp.com/emojis/851270166558343189.gif?size=96&quality=lossless');
                    
                    await interaction.editReply({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Error in addpremium command:', error);
                try {
                    await interaction.editReply({ 
                        content: '❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง',
                        flags: 64
                    });
                } catch (e) {
                    console.error('Error sending error message:', e);
                }
            }
            return;
        }

        if (commandName === 'deletepremium') {
            try {
                if (interaction.user.id !== '1328004426912370709') { 
                    return await interaction.reply({ 
                        content: '❌ เฉพาะผู้พัฒนาสามารถใช้คำสั่งนี้ได้',
                        flags: 64
                    });
                }

                await interaction.deferReply();

                const guildIdToRemove = options.getString('guild_id');
                
                // ลบออกจากรายการ premium guilds
                if (removePremiumGuild(guildIdToRemove)) {
                    // ลบ expiry data ด้วย
                    const expiryData = getPremiumExpiryData();
                    if (expiryData[guildIdToRemove]) {
                        delete expiryData[guildIdToRemove];
                        savePremiumExpiryData(expiryData);
                    }
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🗑️ ลบ Premium เรียบร้อย')
                        .setDescription(`\`\`\`diff\n- ลบ Premium ออกจากเซิร์ฟเวอร์ ID: ${guildIdToRemove}\n\`\`\``)
                        .addFields(
                            { name: '📊 สถานะ', value: '❌ เซิร์ฟเวอร์นี้ไม่สามารถใช้งานคำสั่ง Premium ได้อีก', inline: false }
                        )
                        .setColor('#ff9900')
                        .setFooter({ text: '⭐ Premium System', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Error in deletepremium command:', error);
                try {
                    await interaction.editReply({ 
                        content: '❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง',
                        flags: 64
                    });
                } catch (e) {
                    console.error('Error sending error message:', e);
                }
            }
            return;
        }

        if (commandName === 'checkpremium') {
            try {
                const checkGuildId = options.getString('guild_id') || guildId;
                const hasPremium = isPremiumGuild(checkGuildId);
                const expiryData = getPremiumExpiryData()[checkGuildId];
                
                const embed = new EmbedBuilder()
                    .setTitle('🔍 ตรวจสอบสถานะพรีเมี่ยม')
                    .setColor(hasPremium ? '#00ff00' : '#ff0000')
                    .setDescription(`\`\`\`yaml\nเซิร์ฟเวอร์ ID: ${checkGuildId}\n\`\`\``)
                    .addFields(
                        { name: '⭐ สถานะพรีเมี่ยม', value: hasPremium ? '✅ มีพรีเมี่ยม' : '❌ ไม่มีพรีเมี่ยม', inline: false }
                    );
                
                if (expiryData) {
                    embed.addFields(
                        { name: '📅 ซื้อเมื่อ', value: `<t:${Math.floor(expiryData.purchaseDate / 1000)}:F>`, inline: true },
                        { name: '⏰ หมดอายุ', value: `<t:${Math.floor(expiryData.expiry / 1000)}:F>`, inline: true },
                        { name: '📆 จำนวนวัน', value: `${expiryData.days} วัน`, inline: true }
                    );
                }
                
                embed.setFooter({ text: '⭐ Premium System', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed], flags: 64 });
            } catch (error) {
                console.error('Error in checkpremium command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการตรวจสอบ',
                    flags: 64
                });
            }
            return;
        }

        if (commandName === 'เช็คยอดเงิน') {
            try {
                const userMoney = await getUserMoney(interaction.user.id);
                
                const embed = new EmbedBuilder()
                    .setTitle('💰 ยอดเงินในบัญชี')
                    .setColor('#00ff00')
                    .setDescription(`\`\`\`yaml\n👤 ผู้ใช้: ${interaction.user.tag}\n🆔 ID: ${interaction.user.id}\n\`\`\``)
                    .addFields(
                        { name: '💵 ยอดเงินปัจจุบัน', value: `**${userMoney.point.toFixed(2)}** บาท`, inline: true },
                        { name: '📊 ยอดเงินทั้งหมดที่เติม', value: `**${userMoney.pointall.toFixed(2)}** บาท`, inline: true },
                        { name: '⭐ สถานะพรีเมี่ยม', value: `เซิร์ฟเวอร์นี้มีพรีเมี่ยม: ${isPremiumGuild(guildId) ? '✅' : '❌'}`, inline: false }
                    )
                    .setFooter({ text: '💰 Wallet System', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp()
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
                
                await interaction.reply({ embeds: [embed], flags: 64 });
            } catch (error) {
                console.error('Error in เช็คยอดเงิน command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการตรวจสอบยอดเงิน',
                    flags: 64
                });
            }
            return;
        }

        if (commandName === 'รายละเอียดพรีเมี่ยม') {
            try {
                const embed = new EmbedBuilder()
                    .setTitle('⭐ รายละเอียดพรีเมี่ยม')
                    .setColor('#ffcc00')
                    .setDescription('```diff\n+ ระบบพรีเมี่ยมสำหรับเปิดใช้งานคำสั่งพิเศษ\n```')
                    .addFields(
                        { 
                            name: '🎯 รายการพรีเมี่ยม', 
                            value: `**7 วัน** - ราคา **${config.PREMIUM_PRICES["7"]} บาท**\n` +
                                   `**30 วัน** - ราคา **${config.PREMIUM_PRICES["30"]} บาท**`, 
                            inline: false 
                        },
                        { 
                            name: '✨ สิทธิประโยชน์', 
                            value: '✅ ใช้งานคำสั่ง Premium ได้ทั้งหมด\n' +
                                   '✅ ปรับแต่งระบบป้องกันสูงสุด\n' +
                                   '✅ สิทธิพิเศษอื่นๆ ในอนาคต', 
                            inline: false 
                        },
                        { 
                            name: '📝 วิธีการซื้อ', 
                            value: '1. ใช้คำสั่ง `/เติมเงิน` เพื่อเติมเงินเข้าระบบ\n' +
                                   '2. ใช้คำสั่ง `/ซื้อพรีเมี่ยม` เพื่อเลือกจำนวนวัน\n' +
                                   '3. ระบบจะหักเงินและเปิดใช้งานอัตโนมัติ', 
                            inline: false 
                        },
                        { 
                            name: '📞 ติดต่อเติมเงิน', 
                            value: `เบอร์รับเงิน: **${config.PHONE_NUMBER}**`, 
                            inline: false 
                        }
                    )
                    .setFooter({ text: '⭐ Premium System', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp()
                    .setThumbnail('https://cdn.discordapp.com/emojis/851270166558343189.gif?size=96&quality=lossless');
                
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error in รายละเอียดพรีเมี่ยม command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการแสดงรายละเอียดพรีเมี่ยม',
                    flags: 64
                });
            }
            return;
        }

        if (commandName === 'เติมเงิน') {
            try {
                const giftLink = options.getString('ลิงก์อั่งเปา');
                
                await interaction.deferReply({ flags: 64 });
                

                const result = await topupSystem.processTopup(interaction.user.id, giftLink);
                
                if (result.success) {
                    const embed = new EmbedBuilder()
                        .setTitle('✅ เติมเงินสำเร็จ')
                        .setColor('#00ff00')
                        .setDescription(`\`\`\`diff\n+ เติมเงินจำนวน ${result.amount} บาท\n\`\`\``)
                        .addFields(
                            { name: '👤 ผู้เติม', value: `${interaction.user.tag}`, inline: true },
                            { name: '💰 จำนวนเงิน', value: `${result.amount} บาท`, inline: true },
                            { name: '💵 ยอดเงินรวม', value: `${result.userPoints.toFixed(2)} บาท`, inline: true },
                            { name: '📋 ผู้ส่งเงิน', value: result.ownerName || 'ไม่ทราบชื่อ', inline: false }
                        )
                        .setFooter({ text: '💰 Wallet System', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [embed] });
                    

                    await notifyTopup(interaction.user.id, result.amount, result.ownerName || interaction.user.tag);
                    
                } else {

                    const errorMessages = {
                        'INVALID_LINK_FORMAT': '❌ รูปแบบลิงก์อั่งเปาไม่ถูกต้อง',
                        'INVALID_VOUCHER_CODE': '❌ ไม่สามารถดึงรหัสบัตรกำนัลได้',
                        'VOUCHER_OUT_OF_STOCK': '❌ ซองอั่งเปานี้ถูกใช้งานไปแล้ว',
                        'VOUCHER_NOT_FOUND': '❌ ซองอั่งเปานี้ถูกใช้งานไปแล้ว',
                        'HTTP_ERROR': '❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ TrueMoney',
                        'TRANSACTION_ERROR': '❌ เกิดข้อผิดพลาดในการดำเนินการ'
                    };
                    
                    const embed = new EmbedBuilder()
                        .setTitle('❌ การเติมเงินล้มเหลว')
                        .setColor('#ff0000')
                        .setDescription(`\`\`\`diff\n- ${errorMessages[result.error] || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'}\n\`\`\``)
                        .addFields(
                            { name: '📝 ข้อความ', value: result.message || 'ไม่มีข้อความเพิ่มเติม', inline: false },
                            { name: '💡 ข้อแนะนำ', value: 'กรุณาตรวจสอบลิงก์อั่งเปาและลองใหม่อีกครั้ง', inline: false }
                        )
                        .setFooter({ text: '💰 Wallet System', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [embed] });
                }
                
            } catch (error) {
                console.error('Error processing topup:', error);
                
                const embed = new EmbedBuilder()
                    .setTitle('❌ การเติมเงินล้มเหลว')
                    .setColor('#ff0000')
                    .setDescription('```diff\n- เกิดข้อผิดพลาดในการประมวลผล\n```')
                    .addFields(
                        { name: '📝 ข้อความ', value: error.message || 'ไม่ทราบสาเหตุ', inline: false },
                        { name: '💡 ข้อแนะนำ', value: 'กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ', inline: false }
                    )
                    .setFooter({ text: '💰 Wallet System', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
            }
            return;
        }

        if (commandName === 'ซื้อพรีเมี่ยม') {
            try {
                const days = parseInt(options.getString('จำนวนวัน'));
                const price = config.PREMIUM_PRICES[days];
                
                if (!price) {
                    return await interaction.reply({ 
                        content: '❌ จำนวนวันไม่ถูกต้อง', 
                        flags: 64
                    });
                }
                
                await interaction.deferReply({ flags: 64 });
                

                const userMoney = await getUserMoney(interaction.user.id);
                
                if (userMoney.point < price) {
                    const embed = new EmbedBuilder()
                        .setTitle('❌ ยอดเงินไม่เพียงพอ')
                        .setColor('#ff0000')
                        .setDescription(`\`\`\`diff\n- ยอดเงินคงเหลือ: ${userMoney.point.toFixed(2)} บาท\n- ราคาพรีเมี่ยม: ${price} บาท\n\`\`\``)
                        .addFields(
                            { name: '📊 ยอดเงินที่ขาด', value: `${(price - userMoney.point).toFixed(2)} บาท`, inline: true },
                            { name: '💡 วิธีแก้ไข', value: 'กรุณาเติมเงินเพิ่มด้วยคำสั่ง `/เติมเงิน`', inline: false }
                        )
                        .setFooter({ text: '⭐ Premium System', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();
                    
                    return await interaction.editReply({ embeds: [embed] });
                }
                

                const updatedData = await updateUserMoney(interaction.user.id, -price);
                

                const expiryData = getPremiumExpiryData();
                const expiryTime = Date.now() + (days * 24 * 60 * 60 * 1000);
                

                if (expiryData[guildId]) {

                    expiryData[guildId].expiry += (days * 24 * 60 * 60 * 1000);
                } else {

                    expiryData[guildId] = {
                        userId: interaction.user.id,
                        purchaseDate: Date.now(),
                        expiry: expiryTime,
                        days: days,
                        price: price
                    };

                    addPremiumGuild(guildId);
                }
                
                savePremiumExpiryData(expiryData);
                

                loadPremiumCommandsForGuild(guildId);
                
                const embed = new EmbedBuilder()
                    .setTitle('✅ ซื้อพรีเมี่ยมสำเร็จ')
                    .setColor('#00ff00')
                    .setDescription(`\`\`\`diff\n+ เพิ่มพรีเมี่ยมให้เซิร์ฟเวอร์เป็นเวลา ${days} วัน\n\`\`\``)
                    .addFields(
                        { name: '🏠 เซิร์ฟเวอร์', value: `${interaction.guild.name}`, inline: true },
                        { name: '📅 ระยะเวลา', value: `${days} วัน`, inline: true },
                        { name: '💰 ราคา', value: `${price} บาท`, inline: true },
                        { name: '💵 ยอดเงินเหลือ', value: `${updatedData.point.toFixed(2)} บาท`, inline: true },
                        { name: '⏰ วันหมดอายุ', value: `<t:${Math.floor(expiryTime / 1000)}:F>`, inline: false }
                    )
                    .setFooter({ text: '⭐ Premium System', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp()
                    .setThumbnail('https://cdn.discordapp.com/emojis/851270166558343189.gif?size=96&quality=lossless');
                
                await interaction.editReply({ embeds: [embed] });
                

                await notifyPurchase(interaction.user.id, guildId, days, price);
            } catch (error) {
                console.error('Error in ซื้อพรีเมี่ยม command:', error);
                await interaction.editReply({ 
                    content: '❌ เกิดข้อผิดพลาดในการซื้อพรีเมี่ยม',
                    flags: 64
                });
            }
            return;
        }


        if (!checkPremiumAccess(commandName)) {
            return sendNoPremiumMessage(commandName);
        }


        if (commandName === 'setup') {
            try {
                const mode = options.getString('mode');

                if (mode === 'all') {
                    await interaction.deferReply();

                    const category = await interaction.guild.channels.create({
                        name: '🛡️ Security Logs',
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id,
                                deny: [PermissionsBitField.Flags.SendMessages],
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory]
                            },
                            {
                                id: interaction.guild.roles.everyone.id,
                                deny: [PermissionsBitField.Flags.SendMessages],
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory]
                            }
                        ]
                    });

                    const channels = [
                        { name: '📝・moderation-logs', key: 'moderation', emoji: '📝' },
                        { name: '🚫・anti-spam-logs', key: 'antispam', emoji: '🚫' },
                        { name: '🔗・anti-link-logs', key: 'antilink', emoji: '🔗' },
                        { name: '🎫・anti-invite-logs', key: 'antiinvite', emoji: '🎫' },
                        { name: '💣・anti-nuke-logs', key: 'antinuke', emoji: '💣' },
                        { name: '⚡・badwords-logs', key: 'antibadwords', emoji: '⚡' },
                        { name: '🎯・join-gate-logs', key: 'joingate', emoji: '🎯' }
                    ];

                    for (const ch of channels) {
                        const created = await interaction.guild.channels.create({
                            name: ch.name,
                            type: ChannelType.GuildText,
                            parent: category.id,
                            topic: `📊 ${ch.emoji} Security System - ${ch.key.toUpperCase()} Logs`,
                            permissionOverwrites: [
                                {
                                    id: interaction.guild.id,
                                    deny: [PermissionsBitField.Flags.SendMessages],
                                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory]
                                },
                                {
                                    id: interaction.guild.roles.everyone.id,
                                    deny: [PermissionsBitField.Flags.SendMessages],
                                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory]
                                }
                            ]
                        });
                        serverData.log_channels[ch.key] = created.id;
                    }

                    saveServerData(guildId, serverData);

                    const embed = new EmbedBuilder()
                        .setTitle('✨ ระบบได้ถูกติดตั้งเรียบร้อย!')
                        .setDescription('✅ **สร้างหมวดหมู่และช่องบันทึกข้อมูลเรียบร้อยแล้ว**\n\n' +
                            '```yaml\n' +
                            'ช่องที่ถูกสร้าง:\n' +
                            '─────────────────\n' +
                            '📝・moderation-logs\n' +
                            '🚫・anti-spam-logs\n' +
                            '🔗・anti-link-logs\n' +
                            '🎫・anti-invite-logs\n' +
                            '💣・anti-nuke-logs\n' +
                            '⚡・badwords-logs\n' +
                            '🎯・join-gate-logs\n' +
                            '─────────────────\n' +
                            '```')
                        .setColor('#00ffcc')
                        .setFooter({ text: '🛡️ Security System', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp()
                        .setThumbnail('https://cdn.discordapp.com/emojis/1080261532205006938.gif?size=96&quality=lossless');

                    return await interaction.editReply({ embeds: [embed] });
                }

                const setupEmbed = new EmbedBuilder()
                    .setTitle('🎛️ Security Dashboard')
                    .setDescription('```css\n[ เลือกระดับความปลอดภัยของเซิร์ฟเวอร์ ]\n```')
                    .addFields(
                        { 
                            name: '📊 ระดับปัจจุบัน', 
                            value: `\`\`\`css\n[ Level ${serverData.protection_level} ]\n\`\`\``, 
                            inline: false 
                        },
                        { 
                            name: '🛡️ สถานะระบบ', 
                            value: `🔗 Anti-Link: ${serverData.antilink ? '✅' : '❌'}\n🚫 Anti-Spam: ${serverData.antispam ? '✅' : '❌'}\n🎫 Anti-Invite: ${serverData.antiinvite ? '✅' : '❌'}\n💣 Anti-Nuke: ${serverData.antinuke ? '✅' : '❌'}`, 
                            inline: true 
                        }
                    )
                    .setColor('#ff77ff')
                    .setFooter({ text: '🛡️ Security System | Select Menu', iconURL: client.user.displayAvatarURL() })
                    .setThumbnail('https://cdn.discordapp.com/emojis/1080261532205006938.gif?size=96&quality=lossless');

                const menu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select_lv')
                        .setPlaceholder('🎯 เลือกระดับการป้องกันที่ต้องการ...')
                        .addOptions([
                            { 
                                label: '🟢 Level 1: Low Security', 
                                value: 'lvl_1', 
                                description: 'Timeout (2 ชั่วโมง) เมื่อทำผิด',
                                emoji: '🟢'
                            },
                            { 
                                label: '🟡 Level 2: Medium Security', 
                                value: 'lvl_2', 
                                description: 'Kick (เตะออก) เมื่อทำผิด',
                                emoji: '🟡'
                            },
                            { 
                                label: '🔴 Level 3: High Security', 
                                value: 'lvl_3', 
                                description: 'Ban (แบนถาวร) ทันทีที่ทำผิด',
                                emoji: '🔴'
                            },
                            { 
                                label: '⚡ Level 4: Extreme Security', 
                                value: 'lvl_4', 
                                description: 'Ban + Report เมื่อทำผิด',
                                emoji: '⚡'
                            }
                        ])
                );

                await interaction.reply({ embeds: [setupEmbed], components: [menu] });
            } catch (error) {
                console.error('Error in setup command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการตั้งค่าระบบ',
                    flags: 64
                });
            }
        }

        if (commandName === 'dashboard') {
            try {
                const statusEmojis = {
                    true: '🟢',
                    false: '🔴'
                };

                const dashboardEmbed = new EmbedBuilder()
                    .setTitle('🎮 Security Control Panel')
                    .setDescription('```diff\n+ 📊 แผงควบคุมระบบความปลอดภัย\n```')
                    .setColor('#5865F2')
                    .addFields(
                        {
                            name: '🛡️ ระบบป้องกันหลัก',
                            value: `🔗 Anti-Link: ${statusEmojis[serverData.antilink]} ${serverData.antilink ? 'ON' : 'OFF'}\n` +
                                   `🚫 Anti-Spam: ${statusEmojis[serverData.antispam]} ${serverData.antispam ? 'ON' : 'OFF'}\n` +
                                   `🎫 Anti-Invite: ${statusEmojis[serverData.antiinvite]} ${serverData.antiinvite ? 'ON' : 'OFF'}\n` +
                                   `💣 Anti-Nuke: ${statusEmojis[serverData.antinuke]} ${serverData.antinuke ? 'ON' : 'OFF'}\n` +
                                   `⚡ Anti-Badwords: ${statusEmojis[serverData.antibadwords]} ${serverData.antibadwords ? 'ON' : 'OFF'}`,
                            inline: true
                        },
                        {
                            name: '📈 สถิติ',
                            value: `📊 ระดับ: ${serverData.protection_level}\n` +
                                   `👥 Whitelist Users: ${serverData.whitelist_users.length}\n` +
                                   `📁 Whitelist Channels: ${serverData.whitelist_channels.length}\n` +
                                   `🎭 Whitelist Roles: ${serverData.whitelist_roles.length}\n` +
                                   `⚡ Badwords: ${serverData.badwords.length}`,
                            inline: true
                        }
                    )
                    .setFooter({ text: '🛡️ Security System | Control Panel', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp()
                    .setThumbnail('https://cdn.discordapp.com/emojis/1080261532205006938.gif?size=96&quality=lossless');

                const buttonRow1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('toggle_antilink')
                            .setLabel('🔗 Anti-Link')
                            .setStyle(serverData.antilink ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('toggle_antispam')
                            .setLabel('🚫 Anti-Spam')
                            .setStyle(serverData.antispam ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('toggle_antiinvite')
                            .setLabel('🎫 Anti-Invite')
                            .setStyle(serverData.antiinvite ? ButtonStyle.Success : ButtonStyle.Secondary)
                    );

                const buttonRow2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('toggle_antinuke')
                            .setLabel('💣 Anti-Nuke')
                            .setStyle(serverData.antinuke ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('toggle_antibadwords')
                            .setLabel('⚡ Badwords')
                            .setStyle(serverData.antibadwords ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('refresh_dashboard')
                            .setLabel('🔄 Refresh')
                            .setStyle(ButtonStyle.Primary)
                    );

                await interaction.reply({ 
                    embeds: [dashboardEmbed], 
                    components: [buttonRow1, buttonRow2] 
                });
            } catch (error) {
                console.error('Error in dashboard command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการแสดงแดชบอร์ด',
                    flags: 64
                });
            }
        }

        if (commandName === 'anti-link') {
            try {
                serverData.antilink = options.getBoolean('status');
                saveServerData(guildId, serverData);
                
                const embed = new EmbedBuilder()
                    .setTitle(serverData.antilink ? '🔗 เปิดระบบ Anti-Link แล้ว' : '🔗 ปิดระบบ Anti-Link แล้ว')
                    .setColor(serverData.antilink ? '#00ff00' : '#ff0000')
                    .setDescription(`\`\`\`diff\n${serverData.antilink ? '+ ระบบป้องกันลิงก์ถูกเปิดใช้งาน' : '- ระบบป้องกันลิงก์ถูกปิดใช้งาน'}\n\`\`\``)
                    .setFooter({ text: '🛡 Security System', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error in anti-link command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการตั้งค่าระบบ Anti-Link',
                    flags: 64
                });
            }
        }

        if (commandName === 'anti-invite') {
            try {
                serverData.antiinvite = options.getBoolean('status');
                saveServerData(guildId, serverData);
                
                const embed = new EmbedBuilder()
                    .setTitle(serverData.antiinvite ? '🎫 เปิดระบบ Anti-Invite แล้ว' : '🎫 ปิดระบบ Anti-Invite แล้ว')
                    .setColor(serverData.antiinvite ? '#00ff00' : '#ff0000')
                    .setDescription(`\`\`\`diff\n${serverData.antiinvite ? '+ ระบบป้องกันลิงก์เชิญถูกเปิดใช้งาน' : '- ระบบป้องกันลิงก์เชิญถูกปิดใช้งาน'}\n\`\`\``)
                    .setFooter({ text: '🛡️ Security System', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error in anti-invite command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการตั้งค่าระบบ Anti-Invite',
                    flags: 64
                });
            }
        }

        if (commandName === 'anti-spam') {
            try {
                serverData.antispam = options.getBoolean('status');
                saveServerData(guildId, serverData);
                
                const embed = new EmbedBuilder()
                    .setTitle(serverData.antispam ? '🚫 เปิดระบบ Anti-Spam แล้ว' : '🚫 ปิดระบบ Anti-Spam แล้ว')
                    .setColor(serverData.antispam ? '#00ff00' : '#ff0000')
                    .setDescription(`\`\`\`diff\n${serverData.antispam ? '+ ระบบป้องกันสแปมถูกเปิดใช้งาน' : '- ระบบป้องกันสแปมถูกปิดใช้งาน'}\n\`\`\``)
                    .setFooter({ text: '🛡 Security System', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error in anti-spam command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการตั้งค่าระบบ Anti-Spam',
                    flags: 64
                });
            }
        }

        if (commandName === 'anti-nuke') {
            try {
                serverData.antinuke = options.getBoolean('status');
                saveServerData(guildId, serverData);
                
                const embed = new EmbedBuilder()
                    .setTitle(serverData.antinuke ? '💣 เปิดระบบ Anti-Nuke แล้ว' : '💣 ปิดระบบ Anti-Nuke แล้ว')
                    .setColor(serverData.antinuke ? '#00ff00' : '#ff0000')
                    .setDescription(`\`\`\`diff\n${serverData.antinuke ? '+ ระบบป้องกัน Nuke ถูกเปิดใช้งาน' : '- ระบบป้องกัน Nuke ถูกปิดใช้งาน'}\n\`\`\``)
                    .setFooter({ text: '🛡️ Security System', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error in anti-nuke command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการตั้งค่าระบบ Anti-Nuke',
                    flags: 64
                });
            }
        }

        if (commandName === 'banchat') {
            try {
                const word = options.getString('word').toLowerCase();
                
                if (!serverData.badwords.includes(word)) {
                    serverData.badwords.push(word);
                    saveServerData(guildId, serverData);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('⚡ เพิ่มคำไม่เหมาะสมแล้ว')
                        .setColor('#ff9900')
                        .setDescription(`\`\`\`yaml\nคำที่เพิ่ม: ${word}\n\`\`\``)
                        .addFields(
                            { name: '📊 สถิติ', value: `จำนวนคำทั้งหมด: **${serverData.badwords.length}** คำ`, inline: true }
                        )
                        .setFooter({ text: '🛡️ Security System', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed] });
                } else {
                    await interaction.reply({
                        content: '❌ คำนี้มีอยู่ในระบบแล้ว!',
                        flags: 64
                    });
                }
            } catch (error) {
                console.error('Error in banchat command:', error);
                await interaction.reply({
                    content: '❌ เกิดข้อผิดพลาดในการเพิ่มคำ',
                    flags: 64
                });
            }
        }

        if (commandName === 'unbanchatall') {
            try {
                const count = serverData.badwords.length;
                serverData.badwords = [];
                saveServerData(guildId, serverData);
                
                const embed = new EmbedBuilder()
                    .setTitle('🧹 ล้างคำไม่เหมาะสมทั้งหมดแล้ว')
                    .setColor('#00ffcc')
                    .setDescription(`\`\`\`diff\n- ลบคำทั้งหมดออกจากระบบ\n+ จำนวนคำที่ลบ: ${count} คำ\n\`\`\``)
                    .setFooter({ text: '🛡️ Security System', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error in unbanchatall command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการลบคำ',
                    flags: 64
                });
            }
        }

        if (commandName === 'badwords-list') {
            try {
                if (serverData.badwords.length === 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('📜 รายการคำไม่เหมาะสม')
                        .setColor('#ff9900')
                        .setDescription('```yaml\n⚠️  ไม่มีคำที่ไม่เหมาะสมในระบบ\n```')
                        .setFooter({ text: '🛡️ Security System', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();
                    
                    return await interaction.reply({ embeds: [embed] });
                }
                
                const wordsPerPage = 20;
                const pages = Math.ceil(serverData.badwords.length / wordsPerPage);
                
                const embed = new EmbedBuilder()
                    .setTitle('📜 รายการคำไม่เหมาะสม')
                    .setColor('#ff9900')
                    .setDescription(`\`\`\`yaml\n${serverData.badwords.slice(0, wordsPerPage).map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\`\`\``)
                    .addFields(
                        { name: '📊 สถิติ', value: `จำนวนคำทั้งหมด: **${serverData.badwords.length}** คำ\nจำนวนหน้า: **${pages}**`, inline: true }
                    )
                    .setFooter({ 
                        text: `🛡️ Security System | หน้า 1/${pages}`, 
                        iconURL: client.user.displayAvatarURL() 
                    })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error in badwords-list command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการแสดงรายการคำ',
                    flags: 64
                });
            }
        }

        if (commandName === 'whitelist') {
            try {
                const sub = options.getSubcommand();
                
                if (sub === 'add_member') {
                    const user = options.getUser('user');
                    if (!serverData.whitelist_users.includes(user.id)) {
                        serverData.whitelist_users.push(user.id);
                        saveServerData(guildId, serverData);
                        
                        const embed = new EmbedBuilder()
                            .setTitle('👑 เพิ่มผู้ใช้ใน Whitelist')
                            .setColor('#00ff00')
                            .setDescription(`\`\`\`yaml\nผู้ใช้: ${user.tag}\nID: ${user.id}\n\`\`\``)
                            .addFields(
                                { name: '📊 สถิติ', value: `จำนวนผู้ใช้ใน Whitelist: **${serverData.whitelist_users.length}**`, inline: true }
                            )
                            .setFooter({ text: '🛡️ Security System', iconURL: client.user.displayAvatarURL() })
                            .setTimestamp();
                        
                        await interaction.reply({ embeds: [embed] });
                    } else {
                        await interaction.reply({ 
                            content: '❌ ผู้ใช้นี้อยู่ใน Whitelist แล้ว!',
                            flags: 64
                        });
                    }
                } else if (sub === 'add_channel') {
                    const channel = options.getChannel('channel');
                    if (!serverData.whitelist_channels.includes(channel.id)) {
                        serverData.whitelist_channels.push(channel.id);
                        saveServerData(guildId, serverData);
                        
                        const embed = new EmbedBuilder()
                            .setTitle('👑 เพิ่มช่องใน Whitelist')
                            .setColor('#00ff00')
                            .setDescription(`\`\`\`yaml\nช่อง: ${channel.name}\nID: ${channel.id}\n\`\`\``)
                            .addFields(
                                { name: '📊 สถิติ', value: `จำนวนช่องใน Whitelist: **${serverData.whitelist_channels.length}**`, inline: true }
                            )
                            .setFooter({ text: '🛡️ Security System', iconURL: client.user.displayAvatarURL() })
                            .setTimestamp();
                        
                        await interaction.reply({ embeds: [embed] });
                    } else {
                        await interaction.reply({ 
                            content: '❌ ช่องนี้อยู่ใน Whitelist แล้ว!',
                            flags: 64
                        });
                    }
                } else if (sub === 'add_role') {
                    const role = options.getRole('role');
                    if (!serverData.whitelist_roles.includes(role.id)) {
                        serverData.whitelist_roles.push(role.id);
                        saveServerData(guildId, serverData);
                        
                        const embed = new EmbedBuilder()
                            .setTitle('👑 เพิ่มบทบาทใน Whitelist')
                            .setColor('#00ff00')
                            .setDescription(`\`\`\`yaml\nบทบาท: ${role.name}\nID: ${role.id}\n\`\`\``)
                            .addFields(
                                { name: '📊 สถิติ', value: `จำนวนบทบาทใน Whitelist: **${serverData.whitelist_roles.length}**`, inline: true }
                            )
                            .setFooter({ text: '🛡 Security System', iconURL: client.user.displayAvatarURL() })
                            .setTimestamp();
                        
                        await interaction.reply({ embeds: [embed] });
                    } else {
                        await interaction.reply({ 
                            content: '❌ บทบาทนี้อยู่ใน Whitelist แล้ว!',
                            flags: 64
                        });
                    }
                } else if (sub === 'remove_all') {
                    const userCount = serverData.whitelist_users.length;
                    const channelCount = serverData.whitelist_channels.length;
                    const roleCount = serverData.whitelist_roles.length;
                    
                    serverData.whitelist_users = [];
                    serverData.whitelist_channels = [];
                    serverData.whitelist_roles = [];
                    saveServerData(guildId, serverData);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🧹 ล้าง Whitelist ทั้งหมดแล้ว')
                        .setColor('#ff9900')
                        .setDescription(`\`\`\`diff\n- ลบข้อมูล Whitelist ทั้งหมด\n+ ผู้ใช้ที่ลบ: ${userCount} ราย\n+ ช่องที่ลบ: ${channelCount} ช่อง\n+ บทบาทที่ลบ: ${roleCount} บทบาท\n\`\`\``)
                        .setFooter({ text: '🛡️ Security System', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Error in whitelist command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการจัดการ Whitelist',
                    flags: 64
                });
            }
        }

        if (commandName === 'log-channel') {
            try {
                const type = options.getString('type');
                const channel = options.getChannel('channel');
                
                const logTypes = {
                    'antispam': '🚫 Anti-Spam',
                    'antilink': '🔗 Anti-Link',
                    'antinuke': '💣 Anti-Nuke',
                    'antiinvite': '🎫 Anti-Invite',
                    'antibadwords': '⚡ Anti-Badwords',
                    'joingate': '🎯 Join Gate',
                    'moderation': '📝 Moderation'
                };
                
                serverData.log_channels[type] = channel.id;
                saveServerData(guildId, serverData);
                
                const embed = new EmbedBuilder()
                    .setTitle('📝 ตั้งค่าช่องบันทึกแล้ว')
                    .setColor('#5865F2')
                    .setDescription(`\`\`\`yaml\nประเภท: ${logTypes[type]}\nช่อง: ${channel.name}\nID: ${channel.id}\n\`\`\``)
                    .setFooter({ text: '🛡️ Security System', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error in log-channel command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการตั้งค่าช่องบันทึก',
                    flags: 64
                });
            }
        }

        if (commandName === 'kick') {
            try {
                const member = options.getMember('member');
                const reason = options.getString('reason') || 'ไม่มีเหตุผลระบุ';
                
                if (!member) return await interaction.reply({ content: '❌ ไม่พบสมาชิกนี้ในเซิร์ฟเวอร์!', flags: 64 });
                if (!member.kickable) return await interaction.reply({ content: '❌ ฉันไม่มีสิทธิ์เตะสมาชิกคนนี้!', flags: 64 });
                
                await member.kick(reason);
                
                const embed = new EmbedBuilder()
                    .setTitle('👢 เตะสมาชิกเรียบร้อย')
                    .setColor('#ff9900')
                    .addFields(
                        { name: '👤 ผู้ใช้', value: `\`${member.user.tag}\``, inline: true },
                        { name: '🆔 ID', value: `\`${member.id}\``, inline: true },
                        { name: '📝 เหตุผล', value: `\`\`\`${reason}\`\`\``, inline: false }
                    )
                    .setFooter({ text: '🛡️ Security System', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });

                const logChannel = interaction.guild.channels.cache.get(serverData.log_channels.moderation);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('📝 บันทึกการเตะ')
                        .setColor('#ff9900')
                        .addFields(
                            { name: '👤 ผู้ใช้', value: `\`${member.user.tag}\``, inline: true },
                            { name: '👮 ผู้ดำเนินการ', value: `\`${interaction.user.tag}\``, inline: true },
                            { name: '📝 เหตุผล', value: `\`\`\`${reason}\`\`\``, inline: false }
                        )
                        .setFooter({ text: '🛡️ Security System | Moderation Log', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();
                    
                    logChannel.send({ embeds: [logEmbed] });
                }
            } catch (error) {
                console.error('Error in kick command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการเตะสมาชิก!',
                    flags: 64
                });
            }
        }

        if (commandName === 'ban') {
            try {
                const member = options.getMember('member');
                const reason = options.getString('reason') || 'ไม่มีเหตุผลระบุ';
                
                if (!member) return await interaction.reply({ content: '❌ ไม่พบสมาชิกนี้ในเซิร์ฟเวอร์!', flags: 64 });
                if (!member.bannable) return await interaction.reply({ content: '❌ ฉันไม่มีสิทธิ์แบนสมาชิกคนนี้!', flags: 64 });
                
                await member.ban({ reason });
                
                const embed = new EmbedBuilder()
                    .setTitle('🔨 แบนสมาชิกเรียบร้อย')
                    .setColor('#ff0000')
                    .addFields(
                        { name: '👤 ผู้ใช้', value: `\`${member.user.tag}\``, inline: true },
                        { name: '🆔 ID', value: `\`${member.id}\``, inline: true },
                        { name: '📝 เหตุผล', value: `\`\`\`${reason}\`\`\``, inline: false }
                    )
                    .setFooter({ text: '🛡️ Security System', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });

                const logChannel = interaction.guild.channels.cache.get(serverData.log_channels.moderation);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('📝 บันทึกการแบน')
                        .setColor('#ff0000')
                        .addFields(
                            { name: '👤 ผู้ใช้', value: `\`${member.user.tag}\``, inline: true },
                            { name: '👮 ผู้ดำเนินการ', value: `\`${interaction.user.tag}\``, inline: true },
                            { name: '📝 เหตุผล', value: `\`\`\`${reason}\`\`\``, inline: false }
                        )
                        .setFooter({ text: '🛡️ Security System | Moderation Log', iconURL: client.user.displayAvatarURL() })
                        .setTimestamp();
                    
                    logChannel.send({ embeds: [logEmbed] });
                }
            } catch (error) {
                console.error('Error in ban command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการแบนสมาชิก!',
                    flags: 64
                });
            }
        }

        if (commandName === 'info') {
            try {
                const infoEmbed = new EmbedBuilder()
                    .setTitle('📊 ข้อมูลระบบความปลอดภัย')
                    .setColor('#77ffff')
                    .addFields(
                        { 
                            name: '🛠️ การตั้งค่าหลัก', 
                            value: `**ระดับ:** ${serverData.protection_level}\n` +
                                   `**🔗 Anti-Link:** ${serverData.antilink ? '✅' : '❌'}\n` +
                                   `**🚫 Anti-Spam:** ${serverData.antispam ? '✅' : '❌'}\n` +
                                   `**🎫 Anti-Invite:** ${serverData.antiinvite ? '✅' : '❌'}\n` +
                                   `**💣 Anti-Nuke:** ${serverData.antinuke ? '✅' : '❌'}\n` +
                                   `**⚡ Anti-Badwords:** ${serverData.antibadwords ? '✅' : '❌'}`,
                            inline: true
                        },
                        { 
                            name: '👥 Whitelist', 
                            value: `**ผู้ใช้:** ${serverData.whitelist_users.length} ราย\n` +
                                   `**ช่อง:** ${serverData.whitelist_channels.length} ช่อง\n` +
                                   `**บทบาท:** ${serverData.whitelist_roles.length} บทบาท\n` +
                                   `**คำไม่เหมาะสม:** ${serverData.badwords.length} คำ`,
                            inline: true
                        },
                        {
                            name: '⭐ สถานะ Premium',
                            value: `**เซิร์ฟเวอร์มี Premium:** ${isPremiumGuild(guildId) ? '✅' : '❌'}\n` +
                                   `**คำสั่ง Premium:** ${getPremiumCommands().map(cmd => `\`/${cmd}\``).join(', ') || 'ไม่มี'}`,
                            inline: false
                        }
                    )
                    .setFooter({ text: '🛡️ Security System | Server Info', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [infoEmbed] });
            } catch (error) {
                console.error('Error in info command:', error);
                await interaction.reply({ 
                    content: '❌ เกิดข้อผิดพลาดในการแสดงข้อมูล',
                    flags: 64
                });
            }
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'select_lv') {
        try {
            const lv = interaction.values[0].split('_')[1];
            serverData.protection_level = parseInt(lv);
            saveServerData(guildId, serverData);

            const levelDescriptions = {
                1: '🟢 Low Security - Timeout (2 ชั่วโมง)',
                2: '🟡 Medium Security - Kick (เตะออก)',
                3: '🔴 High Security - Ban (แบนถาวร)',
                4: '⚡ Extreme Security - Ban + Report'
            };

            const updateEmbed = new EmbedBuilder()
                .setTitle('✅ ปรับการตั้งค่าเรียบร้อย')
                .setDescription(`\`\`\`diff\n+ เปลี่ยนระดับการป้องกันเป็น: Level ${lv}\n\`\`\``)
                .addFields(
                    { name: '📊 ระดับใหม่', value: `**${levelDescriptions[lv]}**`, inline: false }
                )
                .setColor('#55ff55')
                .setFooter({ text: '🛡️ Security System', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.update({ embeds: [updateEmbed], components: [] });
        } catch (error) {
            console.error('Error in select menu:', error);
        }
    }

    if (interaction.isButton()) {
        const buttonId = interaction.customId;
        
        if (buttonId.startsWith('toggle_')) {
            try {
                const system = buttonId.replace('toggle_', '');
                const commandMap = {
                    'antilink': 'anti-link',
                    'antispam': 'anti-spam',
                    'antiinvite': 'anti-invite',
                    'antinuke': 'anti-nuke',
                    'antibadwords': 'anti-badwords'
                };
                
                const commandName = commandMap[system];
                if (commandName && !checkPremiumAccess(commandName)) {
                    return sendNoPremiumMessage(commandName);
                }

                switch(system) {
                    case 'antilink':
                        serverData.antilink = !serverData.antilink;
                        break;
                    case 'antispam':
                        serverData.antispam = !serverData.antispam;
                        break;
                    case 'antiinvite':
                        serverData.antiinvite = !serverData.antiinvite;
                        break;
                    case 'antinuke':
                        serverData.antinuke = !serverData.antinuke;
                        break;
                    case 'antibadwords':
                        serverData.antibadwords = !serverData.antibadwords;
                        break;
                }
                
                saveServerData(guildId, serverData);

                const statusEmojis = {
                    true: '🟢',
                    false: '🔴'
                };

                const dashboardEmbed = new EmbedBuilder()
                    .setTitle('🎮 Security Control Panel')
                    .setDescription('```diff\n+ 📊 แผงควบคุมระบบความปลอดภัย\n```')
                    .setColor('#5865F2')
                    .addFields(
                        {
                            name: '🛡️ ระบบป้องกันหลัก',
                            value: `🔗 Anti-Link: ${statusEmojis[serverData.antilink]} ${serverData.antilink ? 'ON' : 'OFF'}\n` +
                                   `🚫 Anti-Spam: ${statusEmojis[serverData.antispam]} ${serverData.antispam ? 'ON' : 'OFF'}\n` +
                                   `🎫 Anti-Invite: ${statusEmojis[serverData.antiinvite]} ${serverData.antiinvite ? 'ON' : 'OFF'}\n` +
                                   `💣 Anti-Nuke: ${statusEmojis[serverData.antinuke]} ${serverData.antinuke ? 'ON' : 'OFF'}\n` +
                                   `⚡ Anti-Badwords: ${statusEmojis[serverData.antibadwords]} ${serverData.antibadwords ? 'ON' : 'OFF'}`,
                            inline: true
                        },
                        {
                            name: '📈 สถิติ',
                            value: `📊 ระดับ: ${serverData.protection_level}\n` +
                                   `👥 Whitelist Users: ${serverData.whitelist_users.length}\n` +
                                   `📁 Whitelist Channels: ${serverData.whitelist_channels.length}\n` +
                                   `🎭 Whitelist Roles: ${serverData.whitelist_roles.length}\n` +
                                   `⚡ Badwords: ${serverData.badwords.length}`,
                            inline: true
                        }
                    )
                    .setFooter({ text: '🛡️ Security System | Control Panel', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp()
                    .setThumbnail('https://cdn.discordapp.com/emojis/1080261532205006938.gif?size=96&quality=lossless');

                const buttonRow1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('toggle_antilink')
                            .setLabel('🔗 Anti-Link')
                            .setStyle(serverData.antilink ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('toggle_antispam')
                            .setLabel('🚫 Anti-Spam')
                            .setStyle(serverData.antispam ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('toggle_antiinvite')
                            .setLabel('🎫 Anti-Invite')
                            .setStyle(serverData.antiinvite ? ButtonStyle.Success : ButtonStyle.Secondary)
                    );

                const buttonRow2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('toggle_antinuke')
                            .setLabel('💣 Anti-Nuke')
                            .setStyle(serverData.antinuke ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('toggle_antibadwords')
                            .setLabel('⚡ Badwords')
                            .setStyle(serverData.antibadwords ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('refresh_dashboard')
                            .setLabel('🔄 Refresh')
                            .setStyle(ButtonStyle.Primary)
                    );

                await interaction.update({ 
                    embeds: [dashboardEmbed], 
                    components: [buttonRow1, buttonRow2] 
                });
            } catch (error) {
                console.error('Error in toggle button:', error);
            }
        }
        
        if (buttonId === 'refresh_dashboard') {
            try {
                await interaction.deferUpdate();

                serverData = getServerData(guildId);
                
                const statusEmojis = {
                    true: '🟢',
                    false: '🔴'
                };

                const dashboardEmbed = new EmbedBuilder()
                    .setTitle('🎮 Security Control Panel')
                    .setDescription('```diff\n+ 📊 แผงควบคุมระบบความปลอดภัย (Refreshed)\n```')
                    .setColor('#5865F2')
                    .addFields(
                        {
                            name: '🛡️ ระบบป้องกันหลัก',
                            value: `🔗 Anti-Link: ${statusEmojis[serverData.antilink]} ${serverData.antilink ? 'ON' : 'OFF'}\n` +
                                   `🚫 Anti-Spam: ${statusEmojis[serverData.antispam]} ${serverData.antispam ? 'ON' : 'OFF'}\n` +
                                   `🎫 Anti-Invite: ${statusEmojis[serverData.antiinvite]} ${serverData.antiinvite ? 'ON' : 'OFF'}\n` +
                                   `💣 Anti-Nuke: ${statusEmojis[serverData.antinuke]} ${serverData.antinuke ? 'ON' : 'OFF'}\n` +
                                   `⚡ Anti-Badwords: ${statusEmojis[serverData.antibadwords]} ${serverData.antibadwords ? 'ON' : 'OFF'}`,
                            inline: true
                        },
                        {
                            name: '📈 สถิติ',
                            value: `📊 ระดับ: ${serverData.protection_level}\n` +
                                   `👥 Whitelist Users: ${serverData.whitelist_users.length}\n` +
                                   `📁 Whitelist Channels: ${serverData.whitelist_channels.length}\n` +
                                   `🎭 Whitelist Roles: ${serverData.whitelist_roles.length}\n` +
                                   `⚡ Badwords: ${serverData.badwords.length}`,
                            inline: true
                        }
                    )
                    .setFooter({ text: '🛡️ Security System | Control Panel (Refreshed)', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp()
                    .setThumbnail('https://cdn.discordapp.com/emojis/1080261532205006938.gif?size=96&quality=lossless');

                const buttonRow1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('toggle_antilink')
                            .setLabel('🔗 Anti-Link')
                            .setStyle(serverData.antilink ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('toggle_antispam')
                            .setLabel('🚫 Anti-Spam')
                            .setStyle(serverData.antispam ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('toggle_antiinvite')
                            .setLabel('🎫 Anti-Invite')
                            .setStyle(serverData.antiinvite ? ButtonStyle.Success : ButtonStyle.Secondary)
                    );

                const buttonRow2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('toggle_antinuke')
                            .setLabel('💣 Anti-Nuke')
                            .setStyle(serverData.antinuke ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('toggle_antibadwords')
                            .setLabel('⚡ Badwords')
                            .setStyle(serverData.antibadwords ? ButtonStyle.Success : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('refresh_dashboard')
                            .setLabel('🔄 Refresh')
                            .setStyle(ButtonStyle.Primary)
                    );

                await interaction.editReply({ 
                    embeds: [dashboardEmbed], 
                    components: [buttonRow1, buttonRow2] 
                });
            } catch (error) {
                console.error('Error in refresh button:', error);
            }
        }
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const data = getServerData(message.guild.id);

    const member = message.member;
    if (member) {
        if (data.whitelist_users.includes(message.author.id)) return;
        
        const hasWhitelistRole = member.roles.cache.some(role => 
            data.whitelist_roles.includes(role.id)
        );
        if (hasWhitelistRole) return;
        
        if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    }

    if (data.whitelist_channels.includes(message.channel.id)) return;

    if (data.antilink && /(https?:\/\/[^\s]+)/g.test(message.content)) {
        await handleViolation(message, 'ส่งลิงก์ที่ไม่ได้รับอนุญาต', data, 'antilink');
        return;
    }

    if (data.antiinvite && /discord\.(gg|com\/invite)\/[^\s]+/gi.test(message.content)) {
        await handleViolation(message, 'ส่งลิงก์เชิญ Discord', data, 'antiinvite');
        return;
    }

    if (data.antibadwords && data.badwords.length > 0) {
        const content = message.content.toLowerCase();
        const foundBadword = data.badwords.find(word => content.includes(word));
        
        if (foundBadword) {
            await handleViolation(message, `ใช้คำไม่เหมาะสม: "${foundBadword}"`, data, 'antibadwords');
            return;
        }
    }

    if (data.antispam) {
        const spamResult = checkSpam(message, data);
        if (spamResult) {
            let reason = 'สแปมข้อความ';
            
            switch(spamResult.type) {
                case 'rapid_fire':
                    reason = `ส่งข้อความรัวเกิน ${spamResult.count} ข้อความใน ${spamResult.timeframe}`;
                    break;
                case 'duplicate':
                    reason = `ส่งข้อความซ้ำ "${spamResult.message}" ${spamResult.count} ครั้งติดกัน`;
                    break;
                case 'caps_flood':
                    reason = `ใช้ตัวพิมพ์ใหญ่เกิน ${spamResult.ratio}%`;
                    break;
                case 'word_flood':
                    reason = `ใช้คำซ้ำ: ${spamResult.words.join(', ')}`;
                    break;
                case 'short_spam':
                    reason = `ส่งข้อความสั้นซ้ำ ${spamResult.count} ครั้ง`;
                    break;
            }
            
            await handleViolation(message, reason, data, 'antispam');
            return;
        }
    }
});

async function handleViolation(message, reason, data, type) {
    try {
        await message.delete().catch(() => {});
        
        const level = data.protection_level;
        let actionText = '';
        let actionTaken = '';

        if (level === 1) {
            try {
                // ปรับเวลาเป็น 2 ชั่วโมง (7200000 มิลลิวินาที)
                await message.member.timeout(7200000, reason);
                actionText = 'Muted (2h)';
                actionTaken = '⏰ หมดเวลา 2 ชั่วโมง';
            } catch (e) {
                actionText = 'Warning';
                actionTaken = '⚠️ คำเตือน';
            }
        } else if (level === 2) {
            try {
                await message.member.kick(reason);
                actionText = 'Kicked';
                actionTaken = '👢 เตะออกจากเซิร์ฟเวอร์';
            } catch (e) {
                actionText = 'Warning';
                actionTaken = '⚠️ คำเตือน';
            }
        } else if (level === 3) {
            try {
                await message.member.ban({ reason, days: 1 });
                actionText = 'Banned';
                actionTaken = '🔨 แบนถาวร';
            } catch (e) {
                actionText = 'Warning';
                actionTaken = '⚠️ คำเตือน';
            }
        } else if (level === 4) {
            try {
                await message.member.ban({ reason, days: 7 });
                actionText = 'Banned + Reported';
                actionTaken = '🔨💣 แบนถาวร + รายงาน';
            } catch (e) {
                actionText = 'Warning';
                actionTaken = '⚠️ คำเตือน';
            }
        }

        const logTypeMap = {
            'antilink': 'antilink',
            'antispam': 'antispam',
            'antiinvite': 'antiinvite',
            'antibadwords': 'antibadwords'
        };

        const logChannelId = data.log_channels[logTypeMap[type]] || data.log_channels.moderation;
        if (logChannelId) {
            const logChannel = message.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const typeEmojis = {
                    'antilink': '🔗',
                    'antispam': '🚫',
                    'antiinvite': '🎫',
                    'antibadwords': '⚡'
                };

                const logEmbed = new EmbedBuilder()
                    .setTitle(`${typeEmojis[type] || '⚠️'} ตรวจพบการละเมิดกฏ`)
                    .setColor('#ff0000')
                    .addFields(
                        { 
                            name: '👤 ผู้ใช้', 
                            value: `\`${message.author.tag}\`\nID: \`${message.author.id}\``, 
                            inline: true 
                        },
                        { 
                            name: '📊 การดำเนินการ', 
                            value: `**${actionTaken}**\nระดับ: ${level}`, 
                            inline: true 
                        },
                        { 
                            name: '📝 เหตุผล', 
                            value: `\`\`\`${reason}\`\`\``, 
                            inline: false 
                        },
                        { 
                            name: '📁 ช่อง', 
                            value: `${message.channel}`, 
                            inline: true 
                        },
                        { 
                            name: '🕒 เวลา', 
                            value: `<t:${Math.floor(Date.now() / 1000)}:T>`, 
                            inline: true 
                        }
                    )
                    .setFooter({ 
                        text: `🛡️ Security System | ${type.toUpperCase()} Log`, 
                        iconURL: client.user.displayAvatarURL() 
                    })
                    .setTimestamp()
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));
                    
                if (message.content.length < 1000) {
                    logEmbed.addFields({
                        name: '📜 ข้อความต้นฉบับ',
                        value: `\`\`\`${message.content.replace(/`/g, '\\`')}\`\`\``,
                        inline: false
                    });
                }

                logChannel.send({ embeds: [logEmbed] }).catch(console.error);
            }
        }

        try {
            const warnEmbed = new EmbedBuilder()
                .setTitle('⚠️ การแจ้งเตือนจากระบบความปลอดภัย')
                .setColor('#ff9900')
                .setDescription(`คุณได้ละเมิดกฎของเซิร์ฟเวอร์ **${message.guild.name}**`)
                .addFields(
                    { name: '📝 เหตุผล', value: reason, inline: false },
                    { name: '⚡ การดำเนินการ', value: actionTaken, inline: false },
                    { name: '📁 ช่อง', value: message.channel.name, inline: true },
                    { name: '🕒 เวลา', value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true }
                )
                .setFooter({ text: '🛡️ Security System', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await message.author.send({ embeds: [warnEmbed] }).catch(() => {});
        } catch (e) {
            // ไม่สามารถส่ง DM ได้
        }

    } catch (e) {
        console.error('❌ Error handling violation:', e);
    }
}

client.on('guildUpdate', async (oldGuild, newGuild) => {
    const data = getServerData(newGuild.id);
    if (!data.antinuke) return;

    const changes = [];
    
    if (oldGuild.name !== newGuild.name) changes.push('ชื่อเซิร์ฟเวอร์');
    if (oldGuild.icon !== newGuild.icon) changes.push('ไอคอนเซิร์ฟเวอร์');
    if (oldGuild.banner !== newGuild.banner) changes.push('แบนเนอร์เซิร์ฟเวอร์');
    
    if (changes.length > 0) {
        const logChannel = newGuild.channels.cache.get(data.log_channels.antinuke);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('💣 เตือน! การเปลี่ยนแปลงเซิร์ฟเวอร์')
                .setColor('#ff0000')
                .setDescription('ตรวจพบการเปลี่ยนแปลงเซิร์ฟเวอร์ที่รวดเร็ว')
                .addFields(
                    { name: '📝 การเปลี่ยนแปลง', value: changes.join('\n'), inline: false },
                    { name: '👤 โดย', value: 'ระบบตรวจพบอัตโนมัติ', inline: true }
                )
                .setFooter({ text: '🛡️ Security System | Anti-Nuke', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();
            
            logChannel.send({ embeds: [embed] });
        }
    }
});

client.login(TOKEN);