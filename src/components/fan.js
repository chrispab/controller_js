import IOBase from "./IOBase.js";
import Logger from "../services/Logger.js";

const logLevel = 'debug';
import { Gpio } from 'onoff';

import config from '../config/config.json' assert { type: 'json' };

var fanStateEventHandler = function (state, mqttAgent) {
  Logger.log('warn', 'PUBLISH Fan: ' + `${state}`);
  mqttAgent.client.publish(config.mqtt.outTopic + "/fan_state", `${state ? 1 : 0}`);
}


class Fan extends IOBase {
  constructor(fanOpPin, onMs, offMs, emitterManager, mqttAgent) {
    super();
    this.offMillis = offMs;
    this.onMillis = onMs;
    this.prevStateChangeMillis = Date.now()-this.offMillis;
    this.emitterManager = emitterManager;
    this.fanOpPin = fanOpPin;
    this.fanIO = Gpio.accessible ? new Gpio(this.fanOpPin, 'out') : { writeSync: value => { console.log('virtual led now uses value: ' + value); } };
    this.mqttAgent = mqttAgent;
    if (this.fanOpPin) {
      this.fanIO.setDirection("out");
    }
    this.emitterManager.on('fanStateChange', fanStateEventHandler);
  }

  turnOn() {
    this.setState(true);

    if (this.fanOpPin) {
      // console.log("Turning on vent");
      this.fanIO.writeSync(1);
    }

    // console.log("Turning on vent");
    Logger.log(logLevel, '==fanIO on==')
  }

  turnOff() {
    this.setState(false);

    if (this.fanOpPin) {
      this.fanIO.writeSync(0);
    }
    // console.log("Turning off vent");
    Logger.log(logLevel, '==fanIO off==')
  }


  process() {

    this.manageFan();

    // Logger.info(`this.prevStateChangeMillis: ${this.prevStateChangeMillis}`);

    if (this.hasNewStateAvailable()) {
      if (this.getStateAndClearNewStateFlag() == true) {
        Logger.log(logLevel, "fan is on");
      } else {
        Logger.log(logLevel, "fan is off");
      }
      this.emitterManager.emit('fanStateChange', this.getState(), this.mqttAgent);
    }
  }

  manageFan() {
    const currentState = this.fanIO.readSync();
    const currentMs = Date.now();

    if (currentState == 1) {
      // is it time to turn off?
      if (currentMs - this.prevStateChangeMillis > this.onMillis) {
        this.turnOff();
        // this.prevStateChangeMillis = Date.now();
      }
    } else {
      // is it time to turn on?
      if (currentMs - this.prevStateChangeMillis > this.offMillis) {
        this.turnOn();
        // this.prevStateChangeMillis = Date.now();
      }
    }
  }

}

export default Fan;
