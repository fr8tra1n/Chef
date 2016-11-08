'use strict';

var Pin = function (config) {
    config = config || {};
    return {
        open: function (pin, usage) {
            return config.isGPIO ? new PinPi(pin, usage) : new PinEmulated(pin, usage);
        }
    };
};

function PinPi(pin, usage) {
    var rpio = require("rpio"),
        option = usage === 'input' ? rpio.INPUT :
            usage === 'output' ? rpio.INPUT :
                rpio.INPUT;

    rpio.open(pin, option);

    return {
        read: function () {
            return gpio.read(pin) === rpio.HIGH;
        },
        write: function (value) {
            gpio.write(pin, value ? rpio.HIGH : rpio.LOW);
        },
        close: function () {
            rpio.close(pin);
        }
    };
}

function PinEmulated(pin, usage) {
    return {
        read: function () {
        },
        write: function (value) {
        },
        close: function () {
        }
    };
}

module.exports = Pin;