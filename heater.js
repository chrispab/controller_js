import IOBase from "./IOBase.js";

class Heater extends IOBase {
    constructor() {
      super();
    }
  
    turnOn() {
      this.setState(true);
      console.log("Turning on heater");
    }
  
    turnOff() {
      this.setState(false);
      console.log("Turning off heater");
    }
  
    process() {
      this.processCount = this.processCount ? this.processCount + 1 : 1;
      console.log(`Heater process count: ${this.processCount}`);
    //   console.log("Heater process");
    }
  }
  
//   export { Heater };

  export default Heater;