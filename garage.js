'use strict';

const EventEmitter = require('events');

class Garage extends EventEmitter {
    constructor(config) {
        super();

        this.isGarageOpen = undefined;
        this.isOperating = false;
        this.operationQueue = 0;
        this.isPositioning = false;
        this.positionHandle = undefined;
        this.isInitial = true;
        this.startHandle = undefined;
        this.garageOpened = undefined;
        this.reminded = undefined;

        //config settings
        this.statusPin = config.statusPin;
        this.statusOpenMatch = config.statusOpenMatch;
        this.operatePin = config.operatePin;
        this.operateIdleValue = config.operateIdleValue;
        this.statusInterval = config.statusInterval || 250;
        this.reminderInterval = config.reminderInterval || 60000;
        this.openCloseDuration = config.openCloseDuration;
        this.operateTimeout = config.operateTimeout || 2000;
        this.operatePulseDuration = config.operatePulseDuration || 200;
        this.operatePulseSleep = config.operatePulseSleep || 100;

        if (this.operateIdleValue === undefined) {
            throw 'Garage operateIdleValue must be defined';
        }

        this.start();
    }

    get isOpen() {
        return this.isGarageOpen;
    }

    get opened() {
        return this.garageOpened;
    }

    open() {
        //todo: implement actual open strategy
        return this.operate();
    }

    close() {
        if (this.isPositioning || !this.isOpen) {
            return false;
        }
        this.isPositioning = true;
        //door is     : opened,  opening, closing, halted
        //door will be: closing, halted,  halted,  opening/closing
        this.operate();

        var positioned = new Date(),
            isClosing = true,
            tryCount = 0;
        this.positionHandle = setInterval(() => {
            //done yet?
            if (!this.isOpen || !this.isPositioning || tryCount > 3) {
                this.isPositioning = false;
                clearInterval(this.positionHandle);
                if (tryCount > 3) {
                    this.emit('action', 'I give up, the door won\'t close');
                }
                return;
            }

            if (isClosing) {
                if (new Date() - positioned > this.openCloseDuration + this.operateTimeout) {
                    //halted or opened
                    positioned = new Date();
                    this.operate();
                    this.emit('action', 'Still trying to close the door');
                    tryCount++;
                }
            }
        }, this.statusInterval);
        return true;
    }

    operate() {
        this.operationQueue++;
        if (this.isOperating) {
            return false;
        }
        this.isOperating = true;

        this.operatePin.write(!this.operateIdleValue);
        setTimeout(() => {
            this.operatePin.write(this.operateIdleValue);
            setTimeout(() => {
                if (--this.operationQueue > 0) {
                    this.operationQueue--;
                    this.operate();
                }
                else {
                    this.isOperating = false;
                }
            }, this.operatePulseSleep);
        }, this.operatePulseDuration);
        return true;
    }

    update(value) {
        //console.log('garage status: ' + value);
        this.isGarageOpen = value == this.statusOpenMatch;
        if (this.isGarageOpen) {
            if (!this.garageOpened) {
                //opened just now
                this.garageOpened = this.reminded = new Date();
                this.emit('open', this.isInitial);
            }
            else if (new Date() - this.reminded > this.reminderInterval) {
                //already open
                this.emit('openReminder', this.garageOpened);
                this.reminded = new Date();
            }
        }
        else if (this.garageOpened) {
            //closed just now
            this.garageOpened = undefined;
            this.emit('close');
        }
    }

    start() {
        //reset and perform initial update
        this.isInitial = true;
        this.garageOpened = this.reminded = undefined;
        this.update(this.statusPin.read());
        this.isInitial = false;

        //poll loop
        var isBusy = false;
        this.startHandle = setInterval(() => {
            if (!isBusy) {
                isBusy = true;
                this.update(this.statusPin.read());
                isBusy = false;
            }
        }, this.statusInterval);
    }

    stop() {
        clearInterval(this.startHandle);
    }

    reset() {
        this.isOperating = false;
        this.isPositioning = false;
        this.operationQueue = 0;
    }
}

module.exports = Garage;