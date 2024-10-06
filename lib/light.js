import IOBase from "./IOBase.js";

export default class Light extends IOBase {
    constructor() {
        super();
    }

    turnOn() {
        this.setState(true);
    }

    turnOff() {
        this.setState(false);
    }

    process() {
        if (this.hasNewState()) {
            if (this.getState()) {
                console.log("Light is on");
            } else {
                console.log("Light is off");
            }
        }
    }
}
