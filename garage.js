'use strict';

var Garage = function (config) {
    var isGarageOpen = undefined,
        isOperating = false,
        operationQueue = 0,
        isPositioning = false,
        positioned = undefined,
        positionHandle = undefined,
        isInitial = true,
        startHandle = undefined,
        garageOpened = undefined,
        reminded = undefined,
        //events
        onOpen = config.onOpen,
        onClose = config.onClose,
        onCloseAction = config.onCloseAction,
        onOpenReminder = config.onOpenReminder,
        //config settings
        statusPin = config.statusPin,
        statusOpenMatch = config.statusOpenMatch,
        operatePin = config.operatePin,
        statusInterval = config.statusInterval || 250,
        reminderInterval = config.reminderInterval || 60000,
        openCloseDuration = config.openCloseDuration,
        operateTimeout = config.operateTimeout || 2000,
        operatePulseDuration = config.operatePulseDuration || 200,
        operatePulseSleep = config.operatePulseSleep;

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

        operatePin.write(true);
        setTimeout(() => {
            operatePin.write(false);
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
                if (onOpen) {
                    onOpen(isInitial);
                }
            }
            else if (onOpenReminder && (new Date() - reminded) > reminderInterval) {
                //already open
                onOpenReminder(garageOpened);
                reminded = new Date();
            }
        }
        else if (garageOpened) {
            //closed just now
            garageOpened = undefined;
            if (onClose) {
                onClose();
            }
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

module.exports = Garage;