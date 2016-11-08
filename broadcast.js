'use strict';

var Broadcast = function (security, bot) {
    function message(msg) {
        security.users.forEach(function (user) {
            if (user.isEnabled) {
                bot.sendMessage(user.chatId, msg);
            }
        });
    }

    return {
        message: message
    };
};

module.exports = Broadcast;