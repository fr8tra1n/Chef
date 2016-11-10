'use strict';

var http = require('http'),
    Pin = require('./pin.js'),
    Garage = require('./garage.js'),
    TelegramBot = require('node-telegram-bot-api'),
    pretty = require('pretty-date'),
    config = require('./config.json'),
    Security = require('./security.js'),
    Broadcast = require('./broadcast.js');

var garageStatusPin,
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
broadcast.message('Vurt da Furk! Bork Bork Bork');
console.log('bot listening');

//set up garage
var garage = new Garage({
    statusPin: garageStatusPin,
    statusOpenMatch: config.garage.statusOpenMatch,
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