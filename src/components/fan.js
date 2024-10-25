import IOBase from "./IOBase.js";
import Logger from "../services/Logger.js";


import { Gpio } from 'onoff';

import config from '../config/config.json' assert { type: 'json' };

var fanStateEventHandler = function (state, mqttAgent) {
  Logger.log('warn', 'PUBLISH Fan: ' + `${state}`);
  mqttAgent.client.publish(config.mqtt.outTopic + "/fan_state", `${state ? 1 : 0}`);
}

const logLevel = 'debug';
// const logLevel = 'info';


class Fan extends IOBase {
  constructor(fanOpPin, onMs, offMs, emitterManager, mqttAgent) {
    const direction = 'out';
    const initialValue = 0;
    super(fanOpPin, direction, initialValue);
    this.setState(false);

    this.setOffMillis(offMs);
    this.setOnMillis(onMs);
    this.setPrevStateChangeMillis(Date.now() - this.offMillis);
    this.emitterManager = emitterManager;
    this.mqttAgent = mqttAgent;

    this.emitterManager.on('fanStateChange', fanStateEventHandler);
    //set new reading available
    this.setNewStateAvailable(true);
    this.processCount = 0;
    this.fanIO = this.IO;
  }

  turnOn() {
    this.setState(true);

    if (this.fanIO) {
      // console.log("Turning on vent");
      this.writeIO(1);
    }

    // console.log("Turning on vent");
    Logger.log(logLevel, '==fanIO on==')
  }

  turnOff() {
    this.setState(false);

    if (this.fanIO) {
      this.writeIO(0);
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
    const elapsedMs = currentMs - this.prevStateChangeMillis;

    if (currentState == true) {
      // is it time to turn off?
      if (elapsedMs >= this.onMillis) {
        this.turnOff();
      }
    } else {// 0
      // is it time to turn on?
      if (elapsedMs >= this.offMillis) {
        this.turnOn();
      }
    }
  }

}

export default Fan;
