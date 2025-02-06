import https from 'https';

function getFirstDayOfMonth(date) {
    const d = new Date(date);
    d.setDate(1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(
        2,
        '0'
    )}${String(d.getDate()).padStart(2, '0')}000000`;
}

function sendPostRequest(monthDate) {
    const data = JSON.stringify({
        processor: 'apiGetDataTimeTable',
        no_authorization: true,
        universalFilter: {
            uid: '9897edee-3c44-11ee-8d96-6cb3115e8254',
            name: 'БПИ2305',
            type: 'CatalogRef',
            catalog: 'УчебныеГруппы',
        },
        monthdata: monthDate,
    });

    const options = {
        hostname: 'lk.mtuci.ru',
        port: 443,
        path: '/ilk/x/getProcessor',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
        },
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve(parsedData);
                } catch (error) {
                    reject('Error parsing response: ' + error.message);
                }
            });
        });

        req.on('error', (e) => {
            reject(`Problem with request: ${e.message}`);
        });

        req.write(data);
        req.end();
    });
}

function findObjectByDate(schedule, targetDate) {
    const formattedTargetDate = targetDate.replace(/-/g, '') + '000000';

    return schedule.find((item) => item['Дата'] === formattedTargetDate);
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getLocation(auditoryName) {
    if (auditoryName.charAt(0) === 'Н' || auditoryName.includes('зал')) {
        return 'Н';
    }
    return 'А';
}

function returnLessons(data) {
    const day = [];
    let location = null;

    for (let i in data['СеткаРасписания']) {
        if (data['СеткаРасписания'][i]['НетЗанятия']) {
            continue;
        }

        const auditoryName = data['СеткаРасписания'][i]['Аудитория'];

        if (!location) {
            location = getLocation(auditoryName);
        }

        const lesson = {
            name: data['СеткаРасписания'][i]['Дисциплина']['name'],
            time: data['СеткаРасписания'][i]['Занятие']['name'],
            lecturer: data['СеткаРасписания'][i]['Преподаватель']['name'],
            room: auditoryName,
            type: data['СеткаРасписания'][i]['ВидНагрузки']['name'],
        };

        day.push(lesson);
    }

    return { lessons: day, location };
}

export async function getScheduleForDate(targetDate) {
    const monthDate = getFirstDayOfMonth(targetDate);
    const response = await sendPostRequest(monthDate);

    if (
        response &&
        response.data &&
        response.data['Ответ'] &&
        response.data['Ответ']['МассивРасписания']
    ) {
        const schedule = response.data['Ответ']['МассивРасписания'];
        const result = findObjectByDate(schedule, targetDate);

        if (result) {
            const lessons = returnLessons(result);
            return {
                noPairs: lessons.lessons.length === 0,
                dateInfo:
                    capitalizeFirstLetter(result['ДеньНедели']) +
                    ', ' +
                    result['ДатаПредставление'],
                ...lessons,
            };
        } else {
            return { noPairs: true };
        }
    } else {
        return { error: 'Ответ не содержит расписания.' };
    }
}

export async function getScheduleForWeek(startDate) {
    const monthDate = getFirstDayOfMonth(startDate);
    const response = await sendPostRequest(monthDate);
  
    if (response && response.data && response.data["Ответ"] && response.data["Ответ"]["МассивРасписания"]) {
      const schedule = response.data["Ответ"]["МассивРасписания"];
      const weekSchedule = {};
  
      for (let i = 0; i < 6; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const result = findObjectByDate(schedule, formattedDate);
  
        if (result) {
          const lessons = returnLessons(result);
          weekSchedule[formattedDate] = {
            noPairs: lessons.lessons.length === 0,
            dateInfo: capitalizeFirstLetter(result["ДеньНедели"]) + ', ' + result["ДатаПредставление"],
            ...lessons
          };
        } else {
          weekSchedule[formattedDate] = { noPairs: true };
        }
      }
  
      return weekSchedule;
    } else {
      return { error: 'Ответ не содержит расписания.' };
    }
  }