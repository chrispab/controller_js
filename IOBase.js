class IOBase {
    constructor() {
        this.state = false;
        this.newStateFlag = false;
        this.defaultState = false;
        this.prevStateChangeMillis = Date.now();
        this.onMillis = 0;
        this.offMillis = 0;
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
        }
    }

    //must be called before using readState()
    hasNewState() {
        return this.newStateFlag;
    }

    readAndClearNewState() {
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

