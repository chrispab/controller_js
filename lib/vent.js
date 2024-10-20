import IOBase from "./IOBase.js";
import Logger from "./Logger.js";
import { Gpio } from 'onoff';

// Logger.debug('vent.js')
// Logger.option('debug');
// transports.console.level = 'debug';




export default class Vent extends IOBase {
  constructor(ventOpPin) {
    super();
    this.ventOpPin = ventOpPin;
    this.ventIO = Gpio.accessible ? new Gpio(this.ventOpPin, 'out') : { writeSync: value => { console.log('virtual led now uses value: ' + value); } };

    if (this.ventOpPin) {
      this.ventIO.setDirection("out");
    }
  }

  turnOn() {
    this.setState(true);

    if (this.ventOpPin) {
      // console.log("Turning on vent");
      this.ventIO.writeSync(1);
    }

    // console.log("Turning on vent");
    Logger.debug('==Vent on==')
  }

  turnOff() {
    this.setState(false);

    if (this.ventOpPin) {
      this.ventIO.writeSync(0);
    }
    // console.log("Turning off vent");
    Logger.debug('==Vent off==')
  }

  process() {
    this.turnOn();
    // this.turnOff();

    if (this.hasNewState()) {
      if (this.readAndClearNewState() == true) {
        console.log("Vent is on");
      } else {
        console.log("Vent is off");
      }
    }
  }
}
