'use strict';

var http = require('http'),
    Pin = require('./pin.js'),
    Garage = require('./garage.js'),
    TelegramBot = require('node-telegram-bot-api'),
    pretty = require('pretty-date'),
    config = require('./config.json'),
    Security = require('./security.js'),
    Broadcast = require('./broadcast.js');

var port = process.env.port || config.port || 1337;
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(config.name + ' ' + config.version);
}).listen(port);

var bot = new TelegramBot(config.telegramToken, { polling: true }),
    security = new Security(config),
    broadcast = new Broadcast(security, bot);

//hello
broadcast.message('Vurt da Furk! Bork Bork Bork');

//setup gpio
var pin = new Pin(config),
    garageStatusPin = pin.open(3, 'input');

//set up garage
var garage = new Garage({
    statusPin: garageStatusPin,
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

//setup bot messages
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