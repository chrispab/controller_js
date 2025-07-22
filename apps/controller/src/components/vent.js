import logger from '../services/logger.js';
import { Gpio } from 'onoff';
import cfg from '../services/config.js';
import eventEmitter from '../services/eventEmitter.js';
import IOBase from './IOBase.js'; // Keep IOBase for ventPowerPin and ventSpeedPin

const logLevel = 'debug';

export default class Vent {
  constructor(name, ventPowerPin, ventSpeedPin) {
    this.name = name;
    this.state = 0; // 0%, 50%, 100%. off,medium,full
    this.newStateFlag = false;
    this.prevStateChangeMs = Date.now();
    this.onMs = cfg.get('vent.onMs');
    this.offMs = cfg.get('vent.offMs');

    this.ventPowerPin = new IOBase(ventPowerPin, 'out', 0);
    this.ventSpeedPin = new IOBase(ventSpeedPin, 'out', 0);
    this.speedPercent = 0;
    this.lightOnSetpointOffset = cfg.get('vent.lightOnSetpointOffset');
    this.ventOverride = false;
    this.ventOverridePulseOnDelta = cfg.get('vent.ventOverridePulseOnDelta');
  }

  // State management methods (formerly from IOPinAccessorsMixin)
  getName() {
    return this.name;
  }

  setName(name) {
    this.name = name;
  }

  getPrevStateChangeMs() {
    return this.prevStateChangeMs;
  }

  setPrevStateChangeMs(newPrevStateChangeMs) {
    this.prevStateChangeMs = newPrevStateChangeMs;
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    if (newState !== this.state) {
      this.state = newState;
      this.newStateFlag = true;
      this.setPrevStateChangeMs(Date.now());
    }
  }

  hasNewStateAvailable() {
    return this.newStateFlag;
  }

  setNewStateAvailable(newStateFlag = true) {
    this.newStateFlag = newStateFlag;
  }

  getStateAndClearNewStateFlag() {
    this.newStateFlag = false;
    return this.state;
  }

  getOnMs() {
    return this.onMs;
  }

  setOnMs(newOnMs) {
    this.onMs = newOnMs;
  }

  getOffMs() {
    return this.offMs;
  }

  setOffMs(newOffMs) {
    this.offMs = newOffMs;
  }

  process() {
    // The process method is no longer needed for control logic,
    // but can be kept for other periodic tasks if necessary.
  }

  control(currentTemp, setPointTemperature, lightState) {
    if (lightState === true) {
      this.lightVentControl(currentTemp, setPointTemperature);
    } else {
      this.darkVentControl();
    }
  }

  lightVentControl(currentTemp, setPointTemperature) {
    const elapsedMsSinceLastStateChange = Date.now() - this.getPrevStateChangeMs();

    if (currentTemp > setPointTemperature + this.lightOnSetpointOffset) {
      this.ventOverride = true;
      this.turnOn(100);
      logger.debug('VENT ON - HI TEMP OVERRIDE - (Re)Triggering vent cooling pulse');
    } else if (this.ventOverride === true && elapsedMsSinceLastStateChange >= this.ventOverridePulseOnDelta) {
      this.turnOff();
      this.ventOverride = false;
      logger.debug('VENT OFF - temperature ok, OVERRIDE - OFF');
    } else if (this.ventOverride === true) {
      logger.debug('VENT ON - override in progress');
    } else {
      // Periodic vent control
      if (this.getState() === 0) { // Use 0 for off state
        if (elapsedMsSinceLastStateChange >= this.getOffMs()) {
          this.turnOn(50);
          logger.debug('VENT ON cycle start');
        }
      } else {
        if (elapsedMsSinceLastStateChange >= this.getOnMs()) {
          this.turnOff();
          logger.debug('VENT OFF cycle start');
        }
      }
    }
  }

  darkVentControl() {
    // Simplified dark vent control - runs on a fixed timer
    const elapsedMsSinceLastStateChange = Date.now() - this.getPrevStateChangeMs();

    if (this.getState() === 0) { // Use 0 for off state
      if (elapsedMsSinceLastStateChange >= cfg.get('vent.ventOffDarkMs')) {
        this.turnOn(50);
      }
    } else {
      if (elapsedMsSinceLastStateChange >= cfg.get('vent.ventOnDarkMs')) {
        this.turnOff();
      }
    }
  }

  turnOn(powerLevel = 50) {
    this.speedPercent = powerLevel;
    if (powerLevel <= 0) {
      this.turnOff();
      return;
    }

    const ventValue = 1 + (powerLevel === 100 ? 1 : 0);
    this.setState(ventValue);

    if (this.hasNewStateAvailable()) {
      if (Gpio.accessible) {
        this.ventPowerPin.writeIO(1);
        this.ventPowerPin.setState(1); // Explicitly set internal state
        this.ventSpeedPin.writeIO(powerLevel === 100 ? 1 : 0);
        this.ventSpeedPin.setState(powerLevel === 100 ? 1 : 0); // Explicitly set internal state
      } else {
        logger.error('==Vent IO undefined==');
      }
      this.emitStateChange();
    }
  }

  turnOff() {
    this.speedPercent = 0;
    this.setState(0);

    if (this.hasNewStateAvailable()) {
      if (Gpio.accessible) {
        this.ventPowerPin.writeIO(0);
        this.ventPowerPin.setState(0); // Explicitly set internal state
        this.ventSpeedPin.writeIO(0);
        this.ventSpeedPin.setState(0); // Explicitly set internal state
      } else {
        logger.error('==Vent IO undefined==');
      }
      this.emitStateChange();
    }
  }

  emitStateChange() {
    const ventState = this.ventPowerPin.getState();
    const speedState = this.ventSpeedPin.getState();
    const ventValue = ventState === 1 && speedState === 0 ? 1 : ventState === 1 && speedState === 1 ? 2 : 0;

    logger.debug(`emitStateChange - ventState: ${ventState}, speedState: ${speedState}, ventValue: ${ventValue}`);

    eventEmitter.emit('ventStateChanged', { 
      state: ventState, 
      speed: speedState, 
      value: ventValue 
    });
  }
}