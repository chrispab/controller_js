import { Gpio } from 'onoff';


class IOBase {
    #state = false;
    #newStateFlag = false;
    #prevStateChangeMillis = 0;
    #onMillis = 0;
    #offMillis = 0;
    #IOPin = 0;
    #IO = null;
    constructor(IOPin, direction, initialValue) {
        this.#state = initialValue;
        this.#newStateFlag = false;
        this.#prevStateChangeMillis = Date.now();
        this.#onMillis = 10 * 1000;
        this.#offMillis = 10 * 1000;

        this.#IOPin = IOPin;

        if (direction === 'out') {
            this.#IO = Gpio.accessible ? new Gpio(this.#IOPin, 'out') : { writeSync: value => { console.log('virtual led now uses value: ' + value); } };
            if (this.#IO && typeof this.#IO.writeSync === 'function') {
                this.#IO.setDirection("out");
                this.#IO.writeSync(initialValue);
            }
        } else if (direction === 'in' ) {
            this.#IO = Gpio.accessible ? new Gpio(this.#IOPin, 'in') : { readSync: value => { console.log('virtual input now uses value: ' + value); } };
            if (this.#IO && typeof this.#IO.readSync === 'function') {
                this.#IO.setDirection("in");
            }
        }

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
            // this.setPrevStateChangeMillis(Date.now());
        } else {
            console.error("IO write operation is not supported.");
        }
    }




    /**
     * Gets the previous state change time in milliseconds.
     *
     * @return {number} - The previous state change time in milliseconds.
     */
    getPrevStateChangeMillis() {
        return this.prevStateChangeMillis;
    }

    /**
     * Sets the previous state change time in milliseconds.
     *
     * @param {number} newPrevStateChangeMillis - The new previous state change time in milliseconds.
     * @return {undefined}
     */
    setPrevStateChangeMillis(newPrevStateChangeMillis) {
        this.prevStateChangeMillis = newPrevStateChangeMillis;
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
            this.setPrevStateChangeMillis(Date.now());
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

    setOnMillis(onMillis) {
        this.onMillis = onMillis;
    }

    setOffMillis(offMillis) {
        this.offMillis = offMillis;
    }
}

export default IOBase;

