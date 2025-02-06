import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function renderSchedule(date, pairs, location, noPairs) {
    const htmlTemplate = fs.readFileSync(
        path.join(__dirname, 'day.html'),
        'utf-8'
    );

    const style = fs.readFileSync(path.join(__dirname, 'day.css'), 'utf-8');

    const noPairHTML = `<div class="lesson">
        <div class="nopair">Сегодня пар нет!</div>
      </div>`;

    let welcomeHTML = (date, pairs, noPairs) => {
        console.log(noPairs);
        if (noPairs) {
            return `<div class="welcome">${date}</div>`;
        }

        const startTime = pairs[0].time.split('-')[0];
        const endTime = pairs[pairs.length - 1].time.split('-')[1];

        const result = `Пары с ${startTime} до ${endTime}`;

        return `<div class="welcome">${date}</div>
    <div class="welcome-time">${result}</div>`;
    };

    let metroHTML = (location, noPairs) => {
        if (noPairs) {
            return '';
        }

        return `<div class="metro-pill ${location == 'Н' ? 'cyan' : 'yellow'}">
      <div class="metro-round ${location == 'Н' ? 'cyan' : 'yellow'}"></div>
      <p class="metro-text">${location}</p>
    </div>`;
    };

    let scheduleHTML = pairs
        .map((pair) => {
            let lessonType;
            let barColor;

            switch (pair.type) {
                case 'Лекции':
                    lessonType = 'Лекция';
                    barColor = 'green';
                    break;
                case 'Практические занятия':
                    lessonType = 'Практика';
                    barColor = 'blue';
                    break;
                case 'Лабораторные работы':
                    lessonType = 'Лабораторная';
                    barColor = 'red';
                    break;
                default:
                    lessonType = 'Неизвестный тип';
                    barColor = 'gray';
            }

            return `
      <div class="lesson">
        <div class="title">${pair.name}</div>
        <div class="type">${lessonType}</div>
        <div class="teacher">${pair.lecturer}</div>
        <div class="time">${pair.time} • Аудитория: ${pair.room}</div>
        <div class="${barColor}"></div>
      </div>
    `;
        })
        .join('');

    const htmlContent = htmlTemplate
        .replace('/*METRO*/', metroHTML(location, noPairs))
        .replace('/*STYLE*/', style)
        .replace('/*WELCOME*/', welcomeHTML(date, pairs, noPairs))
        .replace('/*SCHEDULE*/', noPairs ? noPairHTML : scheduleHTML);

    return htmlContent;
}

export async function generateDay(date, pairs, location, noPairs, filename) {
    const html = await renderSchedule(date, pairs, location, noPairs);

const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html);
    const height = await page.$eval('.container', (el) => el.offsetHeight);
    await page.setViewport({ width: 512, height: height });
    await page.screenshot({ path: filename, fullPage: true });

    await browser.close();
}
