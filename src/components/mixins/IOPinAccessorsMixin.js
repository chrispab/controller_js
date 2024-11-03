import { Gpio } from 'onoff';
import logger from "../../services/logger.js";
const logLevel = 'debug';

let IOPinAccessorsMixin = {

  setName(name) {
    this.name = name;
  },

  getName() {
    return this.name;
  },

  setState(newState) {
    this.IOPin.setState(newState);
  },

  getState() {
    return this.IOPin.getState();
  },

  setOnMs(onMs) {
    this.IOPin.setOnMs(onMs);
  },

  getOnMs() {
    return this.IOPin.getOnMs();
  },

  setOffMs(offMs) {
    this.IOPin.setOffMs(offMs);
  },

  getOffMs() {
    return this.IOPin.getOffMs();
  },

  getPrevStateChangeMs() {
    return this.IOPin.getPrevStateChangeMs();
  },

  setPrevStateChangeMs(newPrevStateChangeMs) {
    this.IOPin.setPrevStateChangeMs(newPrevStateChangeMs);
  },

  setNewStateAvailable(newStateAvailable) {
    this.IOPin.setNewStateAvailable(newStateAvailable);
  },

  hasNewStateAvailable() {
    return this.IOPin.hasNewStateAvailable();
  },

  getStateAndClearNewStateFlag() {
    return this.IOPin.getStateAndClearNewStateFlag();
  },

  turnOn() {
    this.setState(true);

    if (Gpio.accessible) {
      this.IOPin.writeIO(1);
    } else {
      logger.error('==' + this.getName() + ' IO undefined==')
    }
    if (this.emitIfStateChanged()) {
      logger.log('debug', '==' + this.getName() + ' IO on==')
    }
  },

  turnOff() {
    this.setState(false);

    if (Gpio.accessible) {
      this.IOPin.writeIO(0);
    } else {
      logger.error('==' + this.getName() + ' IO undefined==')
    }
    if (this.emitIfStateChanged()) {
      logger.log('debug', '==' + this.getName() + ' IO off==')
    }
  },

  getTelemetryData() {

    let telemetry = this.IOPin.getBaseTelemetryData();

    logger.log('debug', `Telemetry for ${this.getName()}: ${JSON.stringify(telemetry)}`);

    return telemetry;
  }

};

export default IOPinAccessorsMixin;