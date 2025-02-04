import { Telegraf } from 'telegraf';
import schedule from 'node-schedule';
import { getScheduleForDate } from './getSchedule.js';
import { generateImage } from './generateImage.js';
import dotenv from 'dotenv';

dotenv.config();

const { TOKEN, CHAT_ID, THREAD_ID } = process.env;
const bot = new Telegraf(TOKEN);

// Планирование отправки расписания в 18:25 каждый день, кроме воскресенья
schedule.scheduleJob({ hour: 15, minute: 25, dayOfWeek: [1, 2, 3, 4, 5, 7] }, async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
  
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
  
    const formattedDate = `${year}-${month}-${day}`;
    const data = await getScheduleForDate(formattedDate);

    await generateImage(data.dateInfo, data.lessons, data.location, data.noPairs, './auto_schedule.png');

    bot.telegram.sendPhoto(CHAT_ID, { source: './auto_schedule.png' }, { reply_to_message_id: THREAD_ID })
        .then(() => console.log('Расписание отправлено'))
        .catch(console.error);
});

bot.launch();
console.log('Бот запущен');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
