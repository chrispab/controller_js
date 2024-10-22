class IOBase {
    constructor() {
        this.state = false;
        this.newStateFlag = false;
        this.defaultState = false;
        this.prevStateChangeMillis = Date.now();
        this.onMillis = 60 * 1000;
        this.offMillis = 10 * 1000;
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
            this.prevStateChangeMillis = Date.now();
        }
    }

    //must be called before using readAndClearNewState()
    hasNewState() {
        return this.newStateFlag;
    }

    setNewStateAvailable( newStateFlag = true) {
        this.newStateFlag = newStateFlag;
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

