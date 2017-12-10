'use strict';

const http = require('http'),
    Pin = require('./pin.js'),
    Garage = require('./garage.js'),
    TelegramBot = require('node-telegram-bot-api'),
    pretty = require('pretty-date'),
    config = require('./config.json'),
    Security = require('./security.js'),
    Broadcast = require('./broadcast.js'),
    fs = require('fs'),
    storage = require('node-persist'),
    GarageHap = require('./garage.hap');

//const sound = require('./sound.js')({ player: config.player });
//const dingSound = './media/ding.mp3';

/*
 * ding sound on X
 * 
process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
    var chunk = process.stdin.read();
    if (chunk !== null) {
        process.stdout.write(`data: ${chunk}`);
        if (chunk.trim() === 'x') {
            sound.play(dingSound);
            setTimeout(() => {
                sound.play(dingSound);
            }, 100);
        }
    }
});
process.stdin.on('end', () => {
    process.stdout.write('end');
});
*/

/*
 * play telegram audio
 * 
var bot = new TelegramBot(config.telegramToken, { polling: true });
//bot.sendAudio(config.users[0].chatId, fs.createReadStream('./media/ding.mp3'));
bot.on('voice', (msg) => {
    console.log(msg);
    console.log(`download voice '${msg.voice.file_id}'`);
    bot.downloadFile(msg.voice.file_id, './media/voice/').then((filename) => {
        console.log(`saved voice to '${filename}'`);
        sound.play(filename);
    });
});
console.log('x to play');
return;
*/

//setup exit handler
function exitHandler(options, err) {
    garageStatusPin.close();
    garageOperatePin.close();
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}
//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));
//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

const security = new Security(config);

//setup gpio
const pin = new Pin(config.rpio),
    garageStatusPin = pin.open(config.garage.statusPin),
    garageOperatePin = pin.open(config.garage.operatePin);
console.log('gpio setup');

//webserver
const port = process.env.port || config.port || 1337;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`${config.name} ${config.version}`);
}).listen(port, () => {
    console.log(`server running at port ${port}`);
});

//setup bot
const bot = new TelegramBot(config.telegramToken, { polling: true }),
    broadcast = new Broadcast(security, bot);
bot.onText(/\/garage/, (msg, match) => {
    //console.log(msg);
    if (security.isAllowed(msg.from.id)) {
        if (garage.isOpen) {
            bot.sendMessage(msg.from.id, 'The garage was opened ' + pretty.format(garage.opened));
        }
        else {
            bot.sendMessage(msg.from.id, 'The garage is closed');
        }
    }
});
bot.onText(/\/open/, (msg, match) => {
    if (security.isAllowed(msg.from.id)) {
        garage.open();
        bot.sendMessage(msg.from.id, 'Opening now...');
    }
});
bot.onText(/\/close/, (msg, match) => {
    if (security.isAllowed(msg.from.id)) {
        if (garage.close()) {
            bot.sendMessage(msg.from.id, 'Closing now...');
        }
        else {
            bot.sendMessage(msg.from.id, 'Garage is already closed');
        }
    }
});
bot.onText(/\/operate/, (msg, match) => {
    if (security.isAllowed(msg.from.id)) {
        if (garage.operate()) {
            bot.sendMessage(msg.from.id, 'Operating now...');
        }
        else {
            bot.sendMessage(msg.from.id, 'Garage is already operating');
        }
    }
});
broadcast.message('Vurt da Furk! Bork Bork Bork');
console.log('bot listening');

//setup garage
console.log('setup garage');
const garage = new Garage({
    statusPin: garageStatusPin,
    statusOpenMatch: config.garage.statusOpenMatch,
    operatePin: garageOperatePin,
    operateIdleValue: config.garage.operatePin.initial,
    statusInterval: config.garage.statusInterval,
    reminderInterval: config.garage.reminderInterval,
    openCloseDuration: config.garage.openCloseDuration,
    operateTimeout: config.garage.operateTimeout,
    operatePulseDuration: config.garage.operatePulseDuration,
    operatePulseSleep: config.garage.operatePulseSleep
});
garage.on('open', (isInitial) => {
    if (isInitial) {
        broadcast.message('The garage is open');
    }
    else {
        broadcast.message('The garage is opening');
    }
});
garage.on('openReminder', (opened) => {
    broadcast.message('The garage was opened ' + pretty.format(opened));
});
garage.on('action', (message) => {
    broadcast.message(message);
});
garage.on('close', () => {
    broadcast.message('The garage is closed');
});
console.log('garage ready');

//setup hap
if (config.garageHap) {
    console.log('setup garage-hap');
    storage.initSync();
    const garageHap = new GarageHap({
        port: config.garageHap.port,
        username: config.garageHap.username,
        pincode: config.garageHap.pincode
    });
    garageHap.on('status', (state) => {
        state.isClosed = !garage.isOpen;
    });
    garageHap.on('close', (state) => {
        garage.close();
    });
    garage.on('open', (isInitial) => {
        if (isInitial) {
            garageHap.opened();
        }
        else {
            garageHap.opening();
        }
    });
    garage.on('close', () => {
        garageHap.closed();
    });
    garageHap.start();
    console.log('garage-hap ready');
}

console.log('chef ready');