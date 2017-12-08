'use strict';

var http = require('http'),
    Pin = require('./pin.js'),
    Garage = require('./garage.js'),
    TelegramBot = require('node-telegram-bot-api'),
    pretty = require('pretty-date'),
    config = require('./config.json'),
    Security = require('./security.js'),
    Broadcast = require('./broadcast.js');
const fs = require('fs');
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

var garageStatusPin,
    garageOperatePin,
    security = new Security(config);

//setup exit handler
function exitHandler(options, err) {
    //clean up
    if (garageStatusPin) {
        garageStatusPin.close();
        console.log('gpio closed');
    }

    if (options.cleanup) console.log('clean');
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}
//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));
//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));

//setup gpio
var pin = new Pin(config);
garageStatusPin = pin.open(config.garage.statusPin);
garageOperatePin = pin.open(config.garage.operatePin);
console.log('gpio setup');

//webserver
var port = process.env.port || config.port || 1337;
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(config.name + ' ' + config.version);
}).listen(port);
console.log('webserver listening at %d', port);

//setup bot
var bot = new TelegramBot(config.telegramToken, { polling: true }),
    broadcast = new Broadcast(security, bot);
bot.onText(/\/garage/, function (msg, match) {
    //console.log(msg);
    if (security.isAllowed(msg.from.id)) {
        if (garage.isOpen()) {
            bot.sendMessage(msg.from.id, 'The garage was opened ' + pretty.format(garage.opened()));
        }
        else {
            bot.sendMessage(msg.from.id, 'The garage is closed');
        }
    }
});
bot.onText(/\/close.garage/, function (msg, match) {
    if (security.isAllowed(msg.from.id)) {
        if (garage.close()) {
            bot.sendMessage(msg.from.id, 'Closing now...');
        }
        else {
            bot.sendMessage(msg.from.id, 'Garage is already closed');
        }
    }
});
bot.onText(/\/operate.garage/, function (msg, match) {
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

//set up garage
var garage = new Garage({
    statusPin: garageStatusPin,
    statusOpenMatch: config.garage.statusOpenMatch,
    operatePin: garageOperatePin,
    onOpen: function (isInitial) {
        if (isInitial) {
            broadcast.message('The garage is open');
        }
        else {
            broadcast.message('The garage is opening');
        }
    },
    onOpenReminder: function (opened) {
        broadcast.message('The garage was opened ' + pretty.format(opened));
    },
    onClose: function () {
        broadcast.message('The garage is closed');
    }
});
console.log('garage listening');

console.log('ready');