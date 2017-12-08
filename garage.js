'use strict';

const EventEmitter = require('events');
const inherits = require('util').inherits;

const Garage = function (config) {
    EventEmitter.call(this);

    var self = this,
        isGarageOpen = undefined,
        isOperating = false,
        operationQueue = 0,
        isPositioning = false,
        positioned = undefined,
        positionHandle = undefined,
        isInitial = true,
        startHandle = undefined,
        garageOpened = undefined,
        reminded = undefined,
        //config settings
        statusPin = config.statusPin,
        statusOpenMatch = config.statusOpenMatch,
        operatePin = config.operatePin,
        operateIdleValue = config.operateIdleValue,
        statusInterval = config.statusInterval || 250,
        reminderInterval = config.reminderInterval || 60000,
        openCloseDuration = config.openCloseDuration,
        operateTimeout = config.operateTimeout || 2000,
        operatePulseDuration = config.operatePulseDuration || 200,
        operatePulseSleep = config.operatePulseSleep || 100;

    if (operateIdleValue === undefined) {
        throw 'Garage operateIdleValue must be defined';
    }

    function isOpen() {
        return isGarageOpen;
    }

    function opened() {
        return garageOpened;
    }

    function open() {
    }

    function close() {
        if (isPositioning || !isGarageOpen) {
            return false;
        }
        isPositioning = true;
        //door is     : opened,  opening, closing, halted
        //door will be: closing, halted,  halted,  opening/closing
        operate();

        positioned = new Date();
        var isOpening = false,
            isClosing = true;
        positionHandle = setInterval(() => {
            //done yet?
            if (!isGarageOpen || !isPositioning) {
                isPositioning = false;
                clearInterval(positionHandle);
                return;
            }

            if (isClosing) {
                if (new Date() - positioned > openCloseDuration + operateTimeout) {
                    //halted or opened
                    positioned = new Date();
                    operate();
                    self.emit('action', 'Still trying to close the door');
                }
            }
        }, statusInterval);
        return true;
    }

    function operate() {
        operationQueue++;
        if (isOperating) {
            return false;
        }
        isOperating = true;

        operatePin.write(!operateIdleValue);
        setTimeout(() => {
            operatePin.write(operateIdleValue);
            setTimeout(() => {
                if (--operationQueue > 0) {
                    operationQueue--;
                    operate();
                }
                else {
                    isOperating = false;
                }
            }, operatePulseSleep);
        }, operatePulseDuration);
        return true;
    }

    function update(value) {
        //console.log('garage status: ' + value);
        isGarageOpen = value == statusOpenMatch;
        if (isGarageOpen) {
            if (!garageOpened) {
                //opened just now
                garageOpened = reminded = new Date();
                self.emit('open', isInitial);
            }
            else if (new Date() - reminded > reminderInterval) {
                //already open
                self.emit('openReminder', garageOpened);
                reminded = new Date();
            }
        }
        else if (garageOpened) {
            //closed just now
            garageOpened = undefined;
            self.emit('close');
        }
    }

    function start() {
        //reset and perform initial update
        isInitial = true;
        garageOpened = reminded = undefined;
        update(statusPin.read());
        isInitial = false;

        //poll loop
        var isBusy = false;
        startHandle = setInterval(function () {
            if (!isBusy) {
                isBusy = true;
                update(statusPin.read());
                isBusy = false;
            }
        }, statusInterval);
    }

    function stop() {
        clearInterval(startHandle);
    }

    function reset() {
        isOperating = false;
        isPositioning = false;
        operationQueue = 0;
    }

    //constructor
    (function () {
        start();
    })();

    return {
        on: self.on,
        open: open,
        close: close,
        isOpen: isOpen,
        opened: opened,
        stop: stop,
        start: start,
        operate: operate,
        reset: reset
    };
};

inherits(Garage, EventEmitter);

module.exports = Garage;