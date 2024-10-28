import IOBase from "./IOBase.js";
import cfg from "config";

import logger from "../services/logger.js";
const logLevel = 'debug';

var heaterStateEventHandler = function (state, mqttAgent) {
  logger.log('warn', 'MQTT-PUB NEW Heater State: ' + `${state}`);
  mqttAgent.client.publish(cfg.get("mqtt.outTopicPrefix") + cfg.get("mqtt.heaterStateTopic"), `${state ? 1 : 0}`);
}
class Heater extends IOBase {
  constructor(heaterIOPin, onMs, offMs, emitterManager, mqttAgent) {
    super(heaterIOPin, 'out', false);
    this.emitterManager = emitterManager;
    this.emitterManager.on('heaterStateChange', heaterStateEventHandler);
    this.mqttAgent = mqttAgent;
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

  process() {
    this.processCount = this.processCount ? this.processCount + 1 : 1;
    this.turnOff();
    // console.log(`Heater process count: ${this.processCount}`);
    //   console.log("Heater process");
  }
  emitIfStateChanged() {
    if (this.hasNewStateAvailable()) {
      if (this.getStateAndClearNewStateFlag() == true) {
        Logger.log(logLevel, "Heater is on");
      } else {
        logger.log(logLevel, "Heater is off");
      }
      this.emitterManager.emit('heaterStateChange', this.getState(), this.mqttAgent);
    }
  }

}

//   export { Heater };


export default Heater;