import IOBase from "./IOBase.js";
import logger from "../services/logger.js";


import { Gpio } from 'onoff';

// import config from '../config/config.json' assert { type: 'json' };
import cfg from "config";
// import { debug } from "winston";

var fanStateEventHandler = function (state, mqttAgent) {
  // logger.log('warn', 'MQTT->Fan: ' + `${state}`);
  logger.log('info', 'MQTT->Fan:  ' + `${cfg.get("mqtt.outTopicPrefix") + cfg.get("mqtt.fanStateTopic") + ": " + (state ? 1 : 0)}`);

  mqttAgent.client.publish(cfg.get("mqtt.outTopicPrefix") + cfg.get("mqtt.fanStateTopic"), `${state ? 1 : 0}`);
}

const logLevel = 'debug';
// const logLevel = 'info';


class Fan extends IOBase {
  constructor(fanOpPin, onMs, offMs, emitterManager, mqttAgent) {
    super(fanOpPin, 'out', 0);
    this.setState(false);
    this.setName('fan');
    this.setOffMs(offMs);
    this.setOnMs(onMs);
    this.setPrevStateChangeMs(Date.now() - this.getOffMs());

    this.emitterManager = emitterManager;
    this.mqttAgent = mqttAgent;

    this.emitterManager.on('fanStateChange', fanStateEventHandler);
    //set new reading available
    this.setNewStateAvailable(true);
    this.processCount = 0;
    // this.fanIO = this.IO;
  }
  getTelemetryData() {

    let superTelemetry = this.getBaseTelemetryData();

    logger.log('debug', `tele fan: ${JSON.stringify(superTelemetry)}`); // logger.error(JSON.stringify(superTelemetry));


    return superTelemetry;
  }
  turnOn() {
    this.setState(true);

    if (Gpio.accessible) {
      // console.log("Turning on vent");
      this.writeIO(1);
    } else {
      logger.error('==fanIO undefined==')
    }
    if (this.emitIfStateChanged()){
      logger.log('debug', '==fanIO on==')
    } 
  }

  turnOff() {
    this.setState(false);

    if (Gpio.accessible) {
      this.writeIO(0);
    } else {
      logger.error('==fanIO undefined==')
    }
    if (this.emitIfStateChanged()){
      logger.log('debug', '==fanIO off==')
    } 
  }


  process() {

    this.manageFan();

    // Logger.info(`this.getPrevStateChangeMs(): ${this.getPrevStateChangeMs()}`);

    // if (this.hasNewStateAvailable()) {
    //   if (this.getStateAndClearNewStateFlag() == true) {
    //     logger.log(logLevel, "fan is on");
    //   } else {
    //     logger.log(logLevel, "fan is off");
    //   }
    // }
  }

  manageFan() {
    const currentState = this.getState();
    const currentMs = Date.now();
    const elapsedMs = currentMs - this.getPrevStateChangeMs();

    if (currentState == true) {
      // is it time to turn off?
      if (elapsedMs >= this.getOnMs()) {
        this.turnOff();
      }
    } else {// 0
      // is it time to turn on?
      if (elapsedMs >= this.getOffMs()) {
        this.turnOn();
      }
    }
  }
  emitIfStateChanged() {
    if (this.hasNewStateAvailable()) {
      if (this.getStateAndClearNewStateFlag() == true) {
        logger.log(logLevel, "Fan is on");
      } else {
        logger.log(logLevel, "Fan is off");
      }
      this.emitterManager.emit('fanStateChange', this.getState(), this.mqttAgent);
      return true
    }
    return false
  }


}

export default Fan;
