import logger from '../services/logger.js';
import { Chip, Line } from "node-libgpiod";

// Initialize the chip at module level, not global.
// This assumes Chip 0 is always the target for this controller.
const chip = new Chip(0);

class IOBase {
  constructor(GPIOPinNumber, direction, initialValue = 0) {
    this.state = initialValue;
    this.newStateFlag = false;
    this.prevStateChangeMs = Date.now();
    this.onMs = 5 * 1000;
    this.offMs = 5 * 1000;
    this.GPIOPinNumber = GPIOPinNumber;
    this.name = 'not yet set-IOBase';
    this.newOnMsFlag = false;
    this.newOffMsFlag = false;
    this.emptyValue = null;

    if (direction === 'out') {
      this.IO = new Line(chip, GPIOPinNumber);
      this.IO.requestOutputMode();
    } else if (direction === 'in') {
      this.IO = new Line(chip, GPIOPinNumber);
      this.IO.requestInputMode();
    } else if (direction === 'disabled') {
      logger.warn(`Disabled IO direction value given. Direction: ${direction}`);
    } else {
      logger.warn(`Invalid IO direction value given. Direction: ${direction}`);
    }
  }

  getName() {
    return this.name;
  }

  setIODirection(direction) {
    if (this.IO ) {
      if (direction === 'out') {
        this.IO.requestOutputMode();
      } else if (direction === 'in') {
        this.IO.requestInputMode();
      } else {
        logger.warn(`Invalid IO direction value given. Direction: ${direction}`);
      }
    } else {
      logger.error('IO direction operation is not supported.');
    }
  }

  readIO() {
    if (this.IO) {
      return this.IO.getValue();
    } else {
      logger.error('IO read operation is not supported.');
      return null;
    }
  }

  writeIO(value) {
    if (this.IO) {
      this.IO.setValue(value);
    } else {
      logger.error('IO write operation is not supported.');
    }
  }

  /**
   * Gets the previous state change time in milliseconds.
   *
   * @return {number} - The previous state change time in milliseconds.
   */
  getPrevStateChangeMs() {
    return this.prevStateChangeMs;
  }

  /**
   * Sets the previous state change time in milliseconds.
   *
   * @param {number} newPrevStateChangeMs - The new previous state change time in milliseconds.
   * @return {undefined}
   */
  setPrevStateChangeMs(newPrevStateChangeMs) {
    this.prevStateChangeMs = newPrevStateChangeMs;
  }

  getState() {
    return this.state;
  }

  /**
   * Sets the state of the IOBase object and indicates if the state is new.
   *
   * @param {boolean} newStateFlag - The new state to be set.
   * @return {undefined}
   */
  setState(newState) {
    if (newState !== this.state) {
      this.state = newState;
      this.newStateFlag = true;
      this.setPrevStateChangeMs(Date.now());
    }
  }

  //must be called before using getStateAndClearNewStateFlag()
  hasNewStateAvailable() {
    return this.newStateFlag;
  }

  setNewStateAvailable(newStateFlag = true) {
    this.newStateFlag = newStateFlag;
  }

  getStateAndClearNewStateFlag() {
    //ensures state change only seen once per state change since last readState
    this.newStateFlag = false; //indicate data read and used e.g MQTT pub
    return this.state;
  }

  setOnMs(newOnMs) {
    if (newOnMs !== this.getOnMs()) {
      this.onMs = newOnMs;
      this.newOnMsFlag = true;
    }
  }

  setOffMs(newOffMs) {
    if (newOffMs !== this.getOffMs()) {
      this.offMs = newOffMs;
      this.newOffMsFlag = true;
    }
  }

  getOnMs() {
    return this.onMs;
  }

  getOffMs() {
    return this.offMs;
  }

  hasNewOnMsAvailable() {
    return this.newStateFlag;
  }

  setNewOnMsAvailable(newStateFlag = true) {
    this.newStateFlag = newStateFlag;
  }

  getOnMsAndClearNewStateFlag() {
    //ensures MQTT pub only sent once per state change since last readState
    this.newStateFlag = false; //indicate data read and used e.g MQTT pub
    return this.state;
  }

  getPropertyValue(propertyName) {
    if (typeof this[propertyName] == 'undefined') return this.emptyValue;
    else return this[propertyName];
  }

  setPropertyValue(propertyName, value) {
    this[propertyName] = value;
  }

  getBaseTelemetryData() {
    //get base telemetry data
    // https://www.geeksforgeeks.org/how-to-use-a-variable-for-a-key-in-a-javascript-object-literal/

    let data = {};
    var key = this.getName();
    data[key] = {
      state: this.getState(),
      onMs: this.getOnMs(),
      offMs: this.getOffMs(),
      time: Date.now(),
    };

    return data;
  }
}

export default IOBase;
