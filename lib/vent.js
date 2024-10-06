import IOBase from "./IOBase.js";

class Vent extends IOBase {
  constructor() {
    super();
  }

  turnOn() {
    this.setState(true);
    console.log("Turning on vent");
  }

  turnOff() {
    this.setState(false);
    console.log("Turning off vent");
  }

  process() {
    if (this.hasNewState()) {
      if (this.readAndClearNewState() == true) {
        console.log("Vent turning on");
      } else {
        console.log("Vent turning off");
      }
    }
  }
}
