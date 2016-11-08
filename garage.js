'use strict';

var Garage = function (config) {
    var isGarageOpen = undefined,
        isInitial = true,
        openCycles = 0,
        garageOpened = undefined,
        statusPin = config.statusPin,
        onOpen = config.onOpen,
        onClose = config.onClose,
        onOpenReminder = config.onOpenReminder,
        reminderInterval = config.reminderInterval || 60000,
        reminded = undefined;

    function isOpen() {
        return isGarageOpen;
    }

    function opened() {
        return garageOpened;
    }

    function open() {
        //todo
    }

    function close() {
        //todo
    }

    function update() {
        isGarageOpen = !statusPin.read();
        //console.log('garage status: ' + value);
        if (isGarageOpen) {
            openCycles++;
            if (!garageOpened) {
                //opened just now
                garageOpened = reminded = new Date();
                openCycles = 0;
            }
            else {
                if (openCycles === 1 && onOpen) {
                    //compensate short surge induced false positive
                    onOpen(isInitial);
                    isInitial = false;
                }
                if (onOpenReminder) {
                    //already open
                    if (new Date() - reminded > reminderInterval) {
                        onOpenReminder(garageOpened);
                        reminded = new Date();
                    }
                }
            }
        }
        else if (garageOpened && onClose) {
            //closed just now
            onClose();
        }
    }

    function start() {
        var isBusy = false;
        setInterval(function () {
            if (!isBusy) {
                isBusy = true;
                update();
                isBusy = false;
            }
        }, 150);
    }

    //constructor
    (function () {
        start();
    })();

    return {
        open: open,
        close: close,
        isOpen: isOpen,
        opened: opened
    };
};

module.exports = Garage;