import IOBase from "./IOBase.js";
import Logger from "./Logger.js";
import { Gpio } from 'onoff';

// var events = require('events');
import events from 'events';
var eventEmitter = new events.EventEmitter();
// var eventEmitter = new events.EventEmitter();


var ventEvent = function () {
    console.log('I hear a scream!');
  }
eventEmitter.on('scream', ventEvent);


// const logLevel = 'info';
const logLevel = 'debug';


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
    Logger.log(logLevel, '==Vent on==')
  }

  turnOff() {
    this.setState(false);

    if (this.ventOpPin) {
      this.ventIO.writeSync(0);
    }
    // console.log("Turning off vent");
    Logger.log(logLevel, '==Vent off==')
  }

  process() {

    this.manageVent();

    // Logger.info(`this.prevStateChangeMillis: ${this.prevStateChangeMillis}`);

    if (this.hasNewState()) {
      if (this.readAndClearNewState() == true) {
        Logger.log(logLevel, "Vent is on");
      } else {
        Logger.log(logLevel, "Vent is off");
      }
    }
  }

  manageVent() {
    const currentState = this.ventIO.readSync();
    const currentMs = Date.now();

    if (currentState == 1) {
      // is it time to turn off?
      if (currentMs - this.prevStateChangeMillis > this.onMillis) {
        this.turnOff();
        //Fire the 'scream' event:
        eventEmitter.emit('scream');
      }
    } else {
      // is it time to turn on?
      if (currentMs - this.prevStateChangeMillis > this.offMillis) {
        this.turnOn();
        //Fire the 'scream' event:
        eventEmitter.emit('scream');
      }
    }
  }
}
