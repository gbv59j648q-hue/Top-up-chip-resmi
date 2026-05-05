const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const userStates = new Map(); 
const userCooldowns = new Map();
const COOLDOWN_TIME = 5000; 

// Ganti dengan nomor Admin Anda
const NOMOR_ADMIN = '6281234567890'; 

// Konfigurasi Client untuk jalan di server GitHub (Linux)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('\n\nSilakan scan QR Code di atas menggunakan WhatsApp Anda.\n\n');
});

client.on('ready', () => {
    console.log('✅ Bot WhatsApp berhasil terhubung dari server GitHub!');
});

client.on('message', async message => {
    const sender = message.from;
    const text = message.body.trim();
    
    const contact = await message.getContact();
    const senderName = contact.pushname || 'Kak'; 
    const currentState = userStates.get(sender);

    // LOGIKA MENU
    if (!currentState) {
        const perkenalan = `Halo *${senderName}*! 👋\nPerkenalkan, saya adalah Asisten Virtual otomatis.`;
        await message.reply(perkenalan);
        const menuUtama = `Silakan pilih menu:\n\n*1.* 👨‍💻 Terhubung langsung ke Arya (Admin)\n*2.* 🤖 Ngobrol dengan Bot AI pintar (Tanya apa saja)`;
        await message.reply(menuUtama);
        userStates.set(sender, 'MENU');
        return;
    }

    if (currentState === 'MENU') {
        if (text === '1') {
            await message.reply(`👨‍💻 *Terhubung ke Admin*\n\nSilakan klik link berikut:\n👉 https://wa.me/${NOMOR_ADMIN}`);
            userStates.delete(sender); 
            return;
        } else if (text === '2') {
            userStates.set(sender, 'AI_MODE'); 
            await message.reply(`🤖 *Mode AI Aktif*\n\nOke *${senderName}*! Silakan tanyakan apapun di sini.\n\n_(Ketik *keluar* untuk kembali)_`);
            return;
        } else {
            await message.reply(`⚠️ Pilihan tidak valid. Balas dengan *1* atau *2*.`);
            return;
        }
    }

    // LOGIKA AI (GEMINI)
    if (currentState === 'AI_MODE') {
        if (text.toLowerCase() === 'keluar' || text.toLowerCase() === 'menu') {
            userStates.set(sender, 'MENU'); 
            await message.reply(`✅ Keluar dari Mode AI.\n\nPilih menu:\n*1.* 👨‍💻 Admin\n*2.* 🤖 Bot AI`);
            return;
        }

        const now = Date.now();
        if (userCooldowns.has(sender) && (now - userCooldowns.get(sender) < COOLDOWN_TIME)) {
            return message.reply('⚠️ _Tunggu sebentar, bot sedang memproses pesan sebelumnya._');
        }
        userCooldowns.set(sender, now);

        try {
            const loadingMsg = await message.reply('⏳ _AI sedang memikirkan jawaban..._');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(text);
            await loadingMsg.reply(result.response.text());
        } catch (error) {
            console.error("Error AI:", error);
            await message.reply('❌ Maaf, sistem AI sedang sibuk.');
        }
    }
});

client.initialize();
