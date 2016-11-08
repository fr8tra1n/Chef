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
    var gpio = require("pi-gpio"),
        isReady = false;
    gpio.open(pin, usage, function () {
        isReady = true;
    });

    return {
        read: function (fn) {
            gpio.read(pin, function (err, value) {
                fn(value, err);
            });
        },
        write: function (value, fn) {
            gpio.write(pin, value, function (err) {
                fn(err);
            });
        }
    };
}

function PinEmulated(pin, usage) {
    return {
        read: function (fn) {
            fn(0);
        },
        write: function (value, fn) {
            fn();
        }
    };
}

module.exports = Pin;