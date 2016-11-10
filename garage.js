'use strict';

var Garage = function (config) {
    var isGarageOpen = undefined,
        isInitial = true,
        garageOpened = undefined,
        statusPin = config.statusPin,
        statusOpenMatch = config.statusOpenMatch,
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
                isInitial = false;
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
        isInitial = true;
        garageOpened = reminded = undefined;
        update(statusPin.read());
        statusPin.poll(update);
    }

    function stop() {
        statusPin.poll(null);
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
        start: start,
        stop: stop
    };
};

module.exports = Garage;