import IOBase from "./IOBase.js";
import logger from "../services/logger.js";

import { Gpio } from 'onoff';

import cfg from "../services/config.js";


// var fanStateEventHandler = function (state, mqttAgent) {
//   // logger.log('warn', 'MQTT->Fan: ' + `${state}`);
//   logger.log('info', 'MQTT->Fan: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.fanStateTopic") + ": " + (state ? 1 : 0)}`);

//   mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.fanStateTopic"), `${state ? 1 : 0}`);
// }

const logLevel = 'debug';
// const logLevel = 'info';


class Fan extends IOBase {
  constructor(mqttAgent) {
    super(cfg.get("hardware.fan.pin"), 'out', 0);
    this.setState(false);
    this.setName('fan');
    this.setOffMs(cfg.get("fan.offMs"));
    this.setOnMs(cfg.get("fan.onMs"));
    this.setPrevStateChangeMs(Date.now() - this.getOffMs());

    // this.emitterManager = emitterManager;
    this.mqttAgent = mqttAgent;

    // this.emitterManager.on('fanStateChange', fanStateEventHandler);
    this.on("fanStateChange", this.fanStateEventHandler);


    //set new reading available
    this.setNewStateAvailable(true);
    this.processCount = 0;

    this.periodicPublishIntervalMs = cfg.get("fan.periodicPublishIntervalMs");
    this.lastPeriodicPublishedMs = Date.now() - this.periodicPublishIntervalMs;

  }

  fanStateEventHandler = function (state, mqttAgent) {
    // logger.log('warn', 'MQTT->Fan: ' + `${state}`);
    logger.log('error', `HI FROM NEW HANDLER fanStateEventHandler`);

    logger.log('info', 'MQTT->Fan: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.fanStateTopic") + ": " + (state ? 1 : 0)}`);
  
    mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.fanStateTopic"), `${state ? 1 : 0}`);
  }
  
  process() {
    this.manageFan();

    this.processPeriodicPublication();
  }

  processPeriodicPublication() {
    // ensure regular publishing of additional propperties
    // such as fanOnMs and fanOffMs
    if (Date.now() >= (this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs)) {
      this.lastPeriodicPublishedMs = Date.now();
      // Zonen/fan_on_delta_secs
      logger.log('info', 'MQTT->periodic fanOnDeltaSecs: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.fanOnDeltaSecsTopic") + ": " + (this.getOnMs() / 1000)}`);
      this.mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.fanOnDeltaSecsTopic"), `${this.getOnMs() / 1000}`);

      // Zonen/fan_off_delta_secs
      logger.log('info', 'MQTT->periodic fanOffDeltaSecs: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.fanOffDeltaSecsTopic") + ": " + (this.getOffMs() / 1000)}`);
      this.mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.fanOffDeltaSecsTopic"), `${this.getOffMs() / 1000}`);
    }
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
    if (this.emitIfStateChanged()) {
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
    if (this.emitIfStateChanged()) {
      logger.log('debug', '==fanIO off==')
    }
  }



  emitIfStateChanged() {
    if (this.hasNewStateAvailable()) {
      if (this.getStateAndClearNewStateFlag() == true) {
        logger.log(logLevel, "Fan is on");
      } else {
        logger.log(logLevel, "Fan is off");
      }
      // this.emitterManager.emit('fanStateChange', this.getState(), this.mqttAgent);
      this.trigger("fanStateChange", this.getState(), this.mqttAgent);

      return true
    }
    return false
  }


}
// https://javascript.info/mixins
import eventMixin from './mixins/eventMixin.js'
// Add the mixin with event-related methods
Object.assign(Fan.prototype, eventMixin);

export default Fan;
