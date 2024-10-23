import IOBase from "./IOBase.js";
import Logger from "../services/Logger.js";
import { Gpio } from 'onoff';

// const logLevel = 'info';
const logLevel = 'debug';
// var events = require('events');
// import events from 'events';
// var eventEmitter = new events.EventEmitter();
// var eventEmitter = new events.EventEmitter();
import config from '../config/config.json' assert { type: 'json' }; // NodeJS version.

// import mqtt from 'mqtt';
// const client = mqtt.connect(config.mqtt.brokerUrl);


// var ventStateEvent = function (state) {
//   Logger.log('info', 'event Vent state: ' + `${state}`);
//   client.publish("ventStateEvent", `${state?1:0}`);
// }

// eventEmitter.on('ventState', ventStateEvent);


var ventStateEvent = function (state, mqttAgent) {
  Logger.log('warn', 'PUBLISH Vent state: ' + `${state}`);
  mqttAgent.client.publish(config.mqtt.outTopic + "/vent_state", `${state ? 1 : 0}`);
}
// this.emitterManager.on('ventState', ventStateEvent);

export default class Vent extends IOBase {
  constructor(ventOpPin, offMs, onMs, emitterManager, mqttAgent) {
    super();
    this.offMillis = offMs;
    this.onMillis = onMs;
    this.emitterManager = emitterManager;
    this.ventOpPin = ventOpPin;
    this.ventIO = Gpio.accessible ? new Gpio(this.ventOpPin, 'out') : { writeSync: value => { console.log('virtual led now uses value: ' + value); } };
    this.mqttAgent = mqttAgent;
    if (this.ventOpPin) {
      this.ventIO.setDirection("out");
    }
    this.emitterManager.on('ventState', ventStateEvent);

  }

  // ventStateEvent = function (state) {
  //   Logger.log('info', 'PUBLISH event Vent state: ' + `${state}`);
  //   this.mqttClient.publish(config.mqtt.outTopic + "/vent_state", `${state ? 1 : 0}`);
  // }

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

    if (this.hasNewStateAvailable()) {
      if (this.getStateAndClearNewStateFlag() == true) {
        Logger.log(logLevel, "Vent is on");
      } else {
        Logger.log(logLevel, "Vent is off");
      }
      this.emitterManager.emit('ventState', this.getState(), this.mqttAgent);
      this.prevStateChangeMillis = Date.now();
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
        // eventEmitter.emit('newVentState',currentState);
      }
    } else {
      // is it time to turn on?
      if (currentMs - this.prevStateChangeMillis > this.offMillis) {
        this.turnOn();
        //Fire the 'scream' event:
        // eventEmitter.emit('newVentState',currentState);
      }

    }
  }
}
