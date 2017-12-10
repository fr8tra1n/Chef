const
    Accessory = require('./hap/').Accessory,
    Service = require('./hap').Service,
    Characteristic = require('./hap').Characteristic,
    uuid = require('./hap').uuid,
    EventEmitter = require('events');

class GarageHap extends EventEmitter {
    constructor(config) {
        super();

        //config settings
        this.username = config.username;
        this.pincode = config.pincode;
        this.port = config.port;
        this.accessory = undefined;

        if (!this.username)
            throw new Error('Username is not provided');
        if (!this.pincode)
            throw new Error('Pincode is not provided');
    }

    closed() {
        this.doorState = Characteristic.CurrentDoorState.CLOSED;
    }

    opened() {
        this.doorState = Characteristic.CurrentDoorState.OPEN;
    }

    opening() {
        this.doorState = Characteristic.CurrentDoorState.OPENING;
    }

    closing() {
        this.doorState = Characteristic.CurrentDoorState.CLOSING;
    }

    stopped() {
        this.doorState = Characteristic.CurrentDoorState.STOPPED;
    }

    set doorState(val) {
        this.accessory
            .getService(Service.GarageDoorOpener)
            .setCharacteristic(Characteristic.CurrentDoorState, val);
    }

    createAccessory() {
        if (this.accessory) {
            return this.accessory;
        }
        const garageUUID = uuid.generate('hap-nodejs:accessories:' + 'GarageDoor'),
            accessory = this.accessory = new Accessory('Garage Door', garageUUID);

        accessory.username = this.username;
        accessory.pincode = this.pincode;

        accessory
            .getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, "Liftmaster")
            .setCharacteristic(Characteristic.Model, "Rev-1")
            .setCharacteristic(Characteristic.SerialNumber, "TW000165");

        accessory.on('identify', (paired, callback) => {
            console.log('GarageHap.identify');
            this.emit('identify');
            callback();
        });

        accessory
            .addService(Service.GarageDoorOpener, "Garage Door")
            .setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED)
            .getCharacteristic(Characteristic.TargetDoorState)
            .on('set', (value, callback) => {
                if (value == Characteristic.TargetDoorState.CLOSED) {
                    console.log('GarageHap.close');
                    this.emit('close');
                    callback();
                }
                else if (value == Characteristic.TargetDoorState.OPEN) {
                    console.log('GarageHap.open');
                    this.emit('open');
                    callback();
                }
            });

        accessory
            .getService(Service.GarageDoorOpener)
            .getCharacteristic(Characteristic.CurrentDoorState)
            .on('get', (callback) => {
                console.log('GarageHap.get');
                var state = {
                    isClosed: undefined
                };
                this.emit('status', state);

                var err = null;
                if (state.isClosed === true) {
                    console.log("Query: Is Garage Open? Yes");
                    callback(err, Characteristic.CurrentDoorState.CLOSED);
                }
                else if (state.isClosed === false) {
                    console.log("Query: Is Garage Open? No");
                    callback(err, Characteristic.CurrentDoorState.OPEN);
                }
                else {
                    console.log("Query: Is Garage Open? Unknown");
                }
            });
        return accessory;
    }

    start() {
        this.createAccessory().publish({
            port: this.port,
            username: this.username,
            pincode: this.pincode
        });
    }
}

module.exports = GarageHap;