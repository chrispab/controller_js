import { Gpio } from 'onoff';
import logger from "../services/logger.js";
// import { on } from 'nodemon';


class IOBase {
    #state = false;
    #newStateFlag = false;
    #prevStateChangeMs = 0;
    #onMs = 0;
    #offMs = 0;
    #IOPin = 0;
    #IO = null;
    #name = "not yet set-IOBase";
    #newOnMsFlag = false;
    #newOffMsFlag = false;
    #prevOnMsChangeMs = 0;
    #prevOffMsChangeMs = 0;
    // #setPrevStateChangeMs = 0;
    
    readIO() {
        if (this.#IO && typeof this.#IO.readSync === 'function') {
            return this.#IO.readSync();
        } else {
            console.error("IO read operation is not supported.");
            return null;
        }
    }
    
    constructor(IOPin, direction, initialValue) {
        this.#state = initialValue;
        this.#newStateFlag = false;
        this.#prevStateChangeMs = Date.now();
        this.#onMs = 10 * 1000;
        this.#offMs = 10 * 1000;
        this.#IOPin = IOPin;
        this.#name = "not yet set";   
        this.#newOnMsFlag = false;
        this.#newOffMsFlag = false;
        this.#prevOnMsChangeMs = Date.now();
        this.#prevOffMsChangeMs = Date.now();
        //log constructor parameters
        // logger.info(`IOBase(${IOPin}, ${direction}, ${initialValue})`);
        this.GPIOAccesible = Gpio.accessible;
        if (direction === 'out') {
            this.#IO = Gpio.accessible ? new Gpio(this.#IOPin, 'out') : { writeSync: value => { console.log('virtual led now uses value: ' + value); } };
            if (this.#IO && typeof this.#IO.writeSync === 'function' && this.GPIOAccesible) {
                this.#IO.setDirection("out");
                this.#IO.writeSync(initialValue);
            }
        } else if (direction === 'in' ) {
            this.#IO = Gpio.accessible ? new Gpio(this.#IOPin, 'in') : { readSync: value => { console.log('virtual input now uses value: ' + value); } };
            if (this.#IO && typeof this.#IO.readSync === 'function' && this.GPIOAccesible) {
                this.#IO.setDirection("in");
            }
        }else {
            logger.error("Invalid direction value.");
        }

    }
    
    getName() {
        return this.#name;
    }

    setName(name) {
        this.#name = name;
    }
    getIOPin() {
        return this.#IOPin;
    }

    setIODirection(direction) {
        if (this.#IO && typeof this.#IO.setDirection === 'function') {
            this.#IO.setDirection(direction);
        } else {
            console.error("IO direction operation is not supported.");
        }
    }

    setIOPin(IOPin) {
        if (typeof IOPin === 'number' && IOPin >= 0) {
            this.#IOPin = IOPin;
        } else {
            console.error("Invalid IOPin value.");
        }
    }
    readIO() {
        if (this.#IO && typeof this.#IO.readSync === 'function') {
            return this.#IO.readSync();
        } else {
            console.error("IO read operation is not supported.");
            return null;
        }
    }

    writeIO(value) {
        if (this.#IO && typeof this.#IO.writeSync === 'function') {
            this.#IO.writeSync(value);
        } else {
            console.error("IO write operation is not supported.");
        }
    }




    /**
     * Gets the previous state change time in milliseconds.
     *
     * @return {number} - The previous state change time in milliseconds.
     */
    getPrevStateChangeMs() {
        return this.prevStateChangeMs;
    }

    /**
     * Sets the previous state change time in milliseconds.
     *
     * @param {number} newPrevStateChangeMs - The new previous state change time in milliseconds.
     * @return {undefined}
     */
    setPrevStateChangeMs(newPrevStateChangeMs) {
        this.prevStateChangeMs = newPrevStateChangeMs;
    }

    getState() {
        return this.state;
    }

    /**
     * Sets the state of the IOBase object and indicates if the state is new.
     *
     * @param {boolean} newStateFlag - The new state to be set.
     * @return {undefined}
     */
    setState(newState) {
        if (newState !== this.state) {
            this.state = newState;
            this.newStateFlag = true;
            this.setPrevStateChangeMs(Date.now());
        }
    }

    //must be called before using getStateAndClearNewStateFlag()
    hasNewStateAvailable() {
        return this.newStateFlag;
    }

    setNewStateAvailable(newStateFlag = true) {
        this.newStateFlag = newStateFlag;
    }

    getStateAndClearNewStateFlag() {
        //ensures MQTT pub only sent once per state change since last readState
        this.newStateFlag = false; //indicate data read and used e.g MQTT pub
        return this.state;
    }

    setOnMs(newOnMs) {
        if (newOnMs !== this.getOnMs() ) {
            this.#onMs = newOnMs;
            this.newOnMsFlag = true;
            this.setPrevOnMsChangeMs(Date.now());
        }
    }

    setOffMs(newOffMs) {
        if (newOffMs !== this.getOffMs() ) {
            this.#offMs = newOffMs;
            this.newOffMsFlag = true;
            this.setPrevOffMsChangeMs(Date.now());
        }
    }
    
    getOnMs() {
        return this.#onMs;
    }

    getOffMs() {
        return this.#offMs;
    }
    
    getPrevOnMsChangeMs() {
        return this.#prevOnMsChangeMs;
    }

    setPrevOnMsChangeMs(newPrevOnMsChangeMs) {
        this.#prevOnMsChangeMs = newPrevOnMsChangeMs;
    }

    getPrevOffMsChangeMs() {
        return this.#prevOffMsChangeMs;
    }

    setPrevOffMsChangeMs(newPrevOffMsChangeMs) {
        this.#prevOffMsChangeMs = newPrevOffMsChangeMs;
    }

    hasNewOnMsAvailable() {
        return this.newStateFlag;
    }

    setNewOnMsAvailable(newStateFlag = true) {
        this.newStateFlag = newStateFlag;
    }

    getOnMsAndClearNewStateFlag() {
        //ensures MQTT pub only sent once per state change since last readState
        this.newStateFlag = false; //indicate data read and used e.g MQTT pub
        return this.state;
    }

    getPropertyValue(propertyName) {
        if(typeof this[propertyName] == "undefined")
            return this.emptyValue;
        else
            return this[propertyName];
    }

    setPropertyValue(propertyName, value) {
        this[propertyName] = value;
    }


    getTelemetryData() {
        //get base telemetry data
        const data = {
            name: this.getName(),
            state: this.getState(),
            onMs: this.getOnMs(),
            offMs: this.getOffMs(),
            time: Date.now()
        }
        // logger.info(JSON.stringify(data) + '=> ' + this.data);

        return data;
      }
}

export default IOBase;

