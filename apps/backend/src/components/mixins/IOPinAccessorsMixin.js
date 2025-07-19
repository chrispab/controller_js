import { Gpio } from 'onoff';
import logger from "../../services/logger.js";
const logLevel = 'debug';

let IOPinAccessorsMixin = {

  setName(name) {
    this.IOPin.name = name;
  },

  getName() {
    return this.IOPin.name;
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


  setIODirection(direction) {
    this.IOPin.setIODirection(direction);
  },

  readIO() {
    return this.IOPin.readIO();
  },

  writeIO(value) {
    this.IOPin.writeIO(value);
  },


  getTelemetryData() {
    let telemetry = this.IOPin.getBaseTelemetryData();
    logger.log('debug', `Telemetry for ${this.getName()}: ${JSON.stringify(telemetry)}`);
    return telemetry;
  }

};

export default IOPinAccessorsMixin;