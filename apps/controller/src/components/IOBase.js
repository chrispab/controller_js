// import {RIO, traceCfg, log, sleep, ctrlC, lineNumber} from "rpi-io"
import { RaspberryPi_2B, Bias} from 'opengpio';
import logger from '../services/logger.js';

class IOBase {
  constructor(GPIOPinName, direction, initialValue = 0) {
    this.state = initialValue;
    this.newStateFlag = false;
    this.prevStateChangeMs = Date.now();
    this.onMs = 5 * 1000;
    this.offMs = 5 * 1000;
    this.GPIOPinName = GPIOPinName;
    this.name = 'not yet set-IOBase';
    this.newOnMsFlag = false;
    this.newOffMsFlag = false;
    this.IO = null;
    // this.prevOnMsChangeMs = Date.now();
    // this.prevOffMsChangeMs = Date.now();
    //log constructor parameters
    // logger.info(`IOBase(${GPIOPinName}, ${direction}, ${initialValue})`);
    // this.GPIOAccessible = Gpio.accessible;
    // this.GPIOAccessible = Gpio.accessible;
    try {
          // const line = lineNumber(GPIOPinName)
      if (direction === 'out' || direction === 'output') {
        this.IO = RaspberryPi_2B.output(GPIOPinName);
        // this.setIODirection('output');
        this.IO.value = initialValue;
        // new RIO(line, "output", {value: initialValue})
      } else if (direction === 'in' || direction === 'input') {
        this.IO = RaspberryPi_2B.input(GPIOPinName);
        // this.setIODirection('input');
      }
    } catch (error) {
      logger.error(`Failed to initialize IOBase for pin ${GPIOPinName}: ${error.message}`);
      this.IO = null;
    }
  }

  setIODirection(direction) {
    try {
      if (direction === 'out' || direction === 'output') {
        this.IO.stop();
        this.IO = RaspberryPi_2B.output(this.GPIOPinName);
        // this.IO.value = this.state;
      } else if (direction === 'in' || direction === 'input') {
        this.IO.stop();
        this.IO = RaspberryPi_2B.input(this.GPIOPinName, { bias: Bias.Disabled});
      }
    } catch (error) {
      logger.error(`IO direction operation failed for pin ${this.GPIOPinName}: ${error.message}`);
    }
  }

  setName(name) {
    this.name = name;
  }

  readIO() {
    if (this.IO) {
      return this.IO.value;
    }
    logger.error(`IO read operation failed: IO not initialized for pin ${this.GPIOPinName}`);
    return null;
  }

  writeIO(writeValue) {
    if (this.IO) {
      this.IO.value = writeValue;
    } else {
      logger.error(`IO write operation failed: IO not initialized for pin ${this.GPIOPinName}`);
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
      // this.setPrevOnMsChangeMs(Date.now());
    }
  }

  setOffMs(newOffMs) {
    if (newOffMs !== this.getOffMs()) {
      this.offMs = newOffMs;
      this.newOffMsFlag = true;
      // this.setPrevOffMsChangeMs(Date.now());
    }
  }

  getOnMs() {
    return this.onMs;
  }

  getOffMs() {
    return this.offMs;
  }

  // getPrevOnMsChangeMs() {
  //     return this.prevOnMsChangeMs;
  // }

  // setPrevOnMsChangeMs(newPrevOnMsChangeMs) {
  //     this.prevOnMsChangeMs = newPrevOnMsChangeMs;
  // }

  // getPrevOffMsChangeMs() {
  //     return this.prevOffMsChangeMs;
  // }

  // setPrevOffMsChangeMs(newPrevOffMsChangeMs) {
  //     this.prevOffMsChangeMs = newPrevOffMsChangeMs;
  // }

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
    // data[key] = "something";
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
