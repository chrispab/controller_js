import IOBase from "./IOBase.js";

class Mqtt extends IOBase {
    constructor(speed, oscillation) {
        super();
        // this._speed = speed;
        // this._oscillation = oscillation;
    }

    turnOn() {
        this.setState(true);
        console.log(`Turning on fan to speed ${this.speed} with ${this.oscillation ? "" : "no"} oscillation`);
    }

    turnOff() {
        this.setState(false);
        console.log("Turning off fan");
    }


    get speed() {
        return this._speed;
    }

    set speed(speed) {
        this._speed = speed;
        console.log(`Setting fan speed to ${speed}`);
    }

    get oscillation() {
        return this._oscillation;
    }

    set oscillation(oscillation) {
        this._oscillation = oscillation;
        console.log(`Setting fan oscillation to ${oscillation ? "on" : "off"}`);
    }

    telemetry() {
        this.setState(true);
        // console.log(`_________telemetry`);
    }

    process() {
        this.processCount = this.processCount ? this.processCount + 1 : 1;
        // console.log(`Fan process count: ${this.processCount}`);
        this.telemetry();
        // if (this.hasNewState()) {
        //     if (this.readAndClearNewState() == true) {
        //         console.log("Fan turning on");
        //     } else {
        //         console.log("Fan turning off");
        //     }
        // }
    }
}

export default Mqtt;
