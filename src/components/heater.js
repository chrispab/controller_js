import IOBase from "./IOBase.js";
// import cfg from "config";
import cfg from "../services/config.js";

import logger from "../services/logger.js";
const logLevel = 'debug';


class Heater extends IOBase {
  constructor( name, heaterPin, mqttAgent) {
    super(heaterPin,  'out', 0);
    this.setName(name);

    this.on("heaterStateChange", this.heaterStateEventHandler);

    this.mqttAgent = mqttAgent;
  }

  heaterStateEventHandler = function (state, mqttAgent) {

    logger.log('info', 'MQTT->Heater: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.heaterStateTopic") + ": " + (state ? 1 : 0)}`);
  
    mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.heaterStateTopic"), `${state ? 1 : 0}`);
  }

  turnOn() {
    this.setState(true);
    // console.log("Turning on heater");
    this.emitIfStateChanged();

  }

  turnOff() {
    this.setState(false);
    // console.log("Turning off heater");
    this.emitIfStateChanged();

  }
  getTelemetryData() {

    let telemetry = this.getBaseTelemetryData();

    logger.log('debug', `tele heater: ${JSON.stringify(telemetry)}`); // logger.error(JSON.stringify(superTelemetry));

    return telemetry;
  }

  process() {
    this.processCount = this.processCount ? this.processCount + 1 : 1;
    this.turnOff();
    // console.log(`Heater process count: ${this.processCount}`);
    //   console.log("Heater process");
  }
  emitIfStateChanged() {
    if (this.hasNewStateAvailable()) {
      if (this.getStateAndClearNewStateFlag() == true) {
        logger.log(logLevel, "Heater is on");
      } else {
        logger.log(logLevel, "Heater is off");
      }
      this.trigger("heaterStateChange", this.getState(), this.mqttAgent);

    }
  }

}

// https://javascript.info/mixins
import eventMixin from './mixins/eventMixin.js'
// Add the mixin with event-related methods
Object.assign(Heater.prototype, eventMixin);

export default Heater;