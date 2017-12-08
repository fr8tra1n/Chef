'use strict';

var rpio;

const Pin = function (config) {
    config = config || {};

    if (!config.mock) {
        rpio = require('rpio');
        rpio.init(config);
    }

    return {
        open: function (pinConfig) {
            if (pinConfig.pin === undefined ||
                (pinConfig.input === undefined &&
                    pinConfig.output === undefined)) {
                console.log(pinConfig);
                throw 'Invalid pin configuration';
            }
            return config.isGPIO ? new PinRpio(pinConfig) : new PinEmulated(pinConfig);
        },
        cleanup: function () {
            if (rpio) {
                rpio.cleanup();
                console.log('cleaned rpio')
            }
        }
    };
};

function PinRpio(pinConfig) {
    var pin = pinConfig.pin;

    //setup pin
    if (pinConfig.input) {
        if (pinConfig.pullDown) {
            rpio.open(pin, rpio.INPUT, rpio.PULL_DOWN);
        }
        else if (pinConfig.pullUp) {
            rpio.open(pin, rpio.INPUT, rpio.PULL_UP);
        }
        else {
            rpio.open(pin, rpio.INPUT);
        }
    }
    else if (pinConfig.output) {
        if (pinConfig.initial === true) {
            rpio.open(pin, rpio.OUTPUT, rpio.HIGH);
        }
        else if (pinConfig.initial === false) {
            rpio.open(pin, rpio.OUTPUT, rpio.LOW);
        }
        else {
            throw 'Output pinconfig must define an initial value';
        }
    }

    return {
        poll: function (onChange) {
            var lastValue = undefined;
            rpio.poll(pin, function () {
                //ignore consecutive duplicates
                var value = rpio.read(pin);
                if (value !== lastValue) {
                    lastValue = value;
                    onChange(value);
                }
            });
        },
        read: function () {
            return rpio.read(pin);
        },
        write: function (value) {
            rpio.write(pin, value ? rpio.HIGH : rpio.LOW);
        },
        close: function () {
            rpio.close(pin);
        }
    };
}

function PinEmulated(pinConfig) {
    return {
        poll: function (onChange) {
        },
        read: function () {
        },
        write: function (value) {
        },
        close: function () {
        }
    };
}

module.exports = Pin;