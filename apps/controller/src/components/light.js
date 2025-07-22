import IOBase from './IOBase.js';
import { Gpio } from 'onoff';
import cfg from '../services/config.js';
import logger from '../services/logger.js';
import eventEmitter from '../services/eventEmitter.js';
import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';

const logLevel = 'debug';

export default class Light {
  constructor(name, LDRPin) {
    this.IOPin = new IOBase(LDRPin, 'out', 0);
    this.setName(name);
    this.setState(false);
    this.RCLoopCount = 0;
    this.currentlySamplingLightSensor = false;
    this.sensorReadIntervalMs = cfg.get('light.sensorReadIntervalMs');

    // Start periodic reading
    setInterval(() => this.readLightSensorState(), this.sensorReadIntervalMs);
    this.readLightSensorState(); // Initial read
  }

  readLightSensorState() {
    this.initiateGetRCChargeLoopCount().then(() => {
      const newState = this.RCLoopCount > 1000 ? 0 : 1;
      if (newState !== this.getState()) {
        this.setState(newState);
        logger.log(logLevel, `New light state: ${this.getState()}`);
        eventEmitter.emit('lightStateChanged', this.getState());
      }
    });
  }

  async initiateGetRCChargeLoopCount() {
    this.RCLoopCount = 0;
    if (Gpio.accessible) {
      // Discharge capacitor
      this.setIODirection('out');
      this.writeIO(0);
      await new Promise(resolve => setTimeout(resolve, 50));

      // Charge capacitor and count
      this.setIODirection('in');
      while (this.readIO() == 0 && this.RCLoopCount < 999999) {
        this.RCLoopCount += 1;
      }
    } else {
      this.RCLoopCount = 111; // Default for demo
      logger.error('GPIO not accessible, returning default RCLoopCount');
    }
  }

  process() {
    // The process method is no longer needed for control logic,
    // but can be kept for other periodic tasks if necessary.
  }
}

// Add the mixin with accessor methods
Object.assign(Light.prototype, IOPinAccessorsMixin);