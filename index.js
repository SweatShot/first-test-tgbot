const TelegramApi = require('node-telegram-bot-api');
const {gameOptions, againOptions} = require('./options.js');
const sequelize = require('./db.js');
const UserModel = require('./modeles.js');
const token = '8453635766:AAEwAnrI8tHMClTcXPVX8FjBm-FVU9QO004'
const bot = new TelegramApi(token, {polling: true});
const chats = {};

const startGame = async (chatId) => {
    await bot.sendMessage(chatId, 'Сейчас я загадаю цифру от 0 до 9, а ты должен будешь отгадать');
    const randomNumber = Math.floor(Math.random() * 10);
    chats[chatId] = randomNumber;
    await bot.sendMessage(chatId, 'Отгадай', gameOptions);
}

const start = async () => {

    try {
        await sequelize.authenticate();
        await sequelize.sync();
    } catch (e) {
        console.log('Подключение к бд сломалось', e);
    }
    bot.setMyCommands([
    {command: '/start', description: 'Начало общения'},
    {command: '/info', description: 'Информация о пользователе'},
    {command: '/game', description: 'Игра угадай число'},
])

    bot.on('message', async msg => {
        const text = msg.text;
        const chatId = msg.chat.id;

        try {
            if (text === '/start') {
                await UserModel.create({chatId});
                await bot.sendSticker(chatId, 'https://tlgrm.ru/_/stickers/8eb/10f/8eb10f4b-8f4f-4958-aa48-80e7af90470a/12.webp')
                return bot.sendMessage(chatId, 'Добро пожаловать в тг бот')
            }
            if (text === '/info') {
                const user = await UserModel.findOne({chatId});
                return bot.sendMessage(chatId, `Тебя зовут ${msg.from.first_name} ${msg.from.last_name}, а в игре у тебя правильных ответов ${user.right}, а неправильных ${user.wrong}`);
            }
            if (text === '/game') {
                return startGame(chatId);
            }
            return bot.sendMessage(chatId, 'Я тебя не понимаю, попробуй еще раз');
        } catch (e) {
            return bot.sendMessage(chatId, 'Произошла какая-то ошибка');
        }
    });

    bot.on('callback_query', async msg => {
        const data = msg.data;
        const chatId = msg.message.chat.id;
        if (data === '/again') {
            return startGame(chatId);
        }
        const user = await UserModel.findOne({chatId});
        if (Number(data) === chats[chatId]) {
            user.right += 1;
            await bot.sendMessage(chatId, `Поздравляю ты отгадал цифру ${chats[chatId]}`, againOptions);
        } else {
            user.wrong += 1
            await bot.sendMessage(chatId, `К сожалению ты не угадал, бот загадал ${chats[chatId]}`, againOptions);
        }
        await user.save();
    });
}

start();