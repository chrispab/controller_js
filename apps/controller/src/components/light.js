import IOBase from './IOBase.js';
import { Gpio } from 'onoff';
import cfg from '../services/config.js';
import logger from '../services/logger.js';
import * as utils from '../utils/utils.js';
import eventEmitter from '../services/eventEmitter.js';

const logLevel = 'debug';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default class Light {
  constructor(name, LDRPin) {
    this.IOPin = new IOBase(LDRPin, 'out', 0);
    this.setName(name);
    this.setState(false);

    this.RCLoopCount = 0;
    this.currentlySamplingLightSensor = false;

    this.sensorReadIntervalMs = cfg.get('light.sensorReadIntervalMs');
    this.periodicPublishIntervalMs = cfg.get('light.periodicPublishIntervalMs');

    // Start autonomous operation
    this.readLightSensorState(); // Initial read
    setInterval(() => this.readLightSensorState(), this.sensorReadIntervalMs);
    // setInterval(() => this.periodicPublication(), this.periodicPublishIntervalMs);
  }

  updateState(newState) {
    const oldState = this.getState();
    if (newState !== oldState) {
      this.setState(newState);
      logger.debug(`Light state changed from ${oldState} to ${newState}`);
      eventEmitter.emit('lightStateChanged', { lightState: newState });
      utils.logAndPublishState('Light', cfg.getWithMQTTPrefix('mqtt.lightStateTopic'), newState ? 1 : 0);
    }
  }

  periodicPublication() {
    if (this.getState() !== null) {
      utils.logAndPublishState('Light P', cfg.getWithMQTTPrefix('mqtt.lightStateTopic'), this.getState());
    }
  }

  readLightSensorState() {
    this.initiateGetRCChargeLoopCount()
      .then((rcCount) => {
        const newState = rcCount <= 1000; // ON if count is low, OFF if high
        this.updateState(newState);
      })
      .catch((error) => {
        logger.error('Error reading light sensor:', error);
      });
  }

  initiateGetRCChargeLoopCount() {
    return new Promise((resolve, reject) => {
      if (this.currentlySamplingLightSensor) {
        // logger.warn('Light sensor sampling already in progress.');
        return resolve(this.RCLoopCount); // return last value if busy
      }

      this.RCLoopCount = 0;
      if (Gpio.accessible) {
        this.currentlySamplingLightSensor = true;
        // Discharge capacitor
        this.IOPin.setIODirection('out');
        this.IOPin.writeIO(0);

        wait(50).then(() => {
          this.IOPin.setIODirection('in');
          while (this.IOPin.readIO() == 0 && this.RCLoopCount < 999999) {
            this.RCLoopCount++;
          }
          // Discharge capacitor again for next reading
          this.IOPin.setIODirection('out');
          this.IOPin.writeIO(0);
          this.currentlySamplingLightSensor = false;
          // logger.warn(`New RCLoopCount: ${this.RCLoopCount}`);
          resolve(this.RCLoopCount);
        });
      } else {
        this.RCLoopCount = 111; // Default for demo mode
        logger.error(`DEMO - Gpio not accessible, returning default RCLoopCount: ${this.RCLoopCount}`);
        resolve(this.RCLoopCount);
      }
    });
  }
}
import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Light.prototype, IOPinAccessorsMixin);
