import IOBase from './IOBase.js';
import cfg from '../services/config.js';
import logger from '../services/logger.js';
import * as utils from '../utils/utils.js';
import eventEmitter from '../services/eventEmitter.js';

const logLevel = 'warn';

export default class Fan {
  constructor(name, fanPin) {
    this.IOPin = new IOBase(fanPin, 'out', 0);
    this.setName(name);
    this.onMs = cfg.get('fan.onMs');
    this.offMs = cfg.get('fan.offMs');
    this.prevStateChangeMs = Date.now() - this.offMs; // Assume it was off before starting

    const periodicPublishIntervalMs = cfg.get('fan.periodicPublishIntervalMs');

    // Start autonomous operation
    setInterval(() => this.controlCycle(), 1000); // Check every second
    setInterval(() => this.periodicPublication(), periodicPublishIntervalMs);

    this.updateState(false); // Ensure initial state is set and published
  }

  controlCycle() {
    const elapsedMs = Date.now() - this.prevStateChangeMs;

    if (this.getState() === true) { // Fan is ON
      if (elapsedMs >= this.onMs) {
        this.updateState(false); // Turn OFF
      }
    } else { // Fan is OFF
      if (elapsedMs >= this.offMs) {
        this.updateState(true); // Turn ON
      }
    }
  }

  updateState(newState) {
    const oldState = this.getState();
    if (newState !== oldState) {
      // This now calls the mixin's setState, which updates the IOPin's state
      this.setState(newState);
      this.prevStateChangeMs = Date.now();

      this.IOPin.writeIO(newState ? 1 : 0);

      logger.log(logLevel, `!!!!!!!${this.getName()} is ${newState ? 'ON' : 'OFF'}`);

      // Emit event on central bus
      eventEmitter.emit('fanStateChanged', { name: this.name, state: newState });

      // Publish state change to MQTT
      utils.logAndPublishState('Fan', cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), newState);
    }
  }

  periodicPublication() {
    // Reload settings in case they were changed in config file
    this.onMs = cfg.get('fan.onMs');
    this.offMs = cfg.get('fan.offMs');

    // Publish current state and settings periodically
    utils.logAndPublishState('Fan P', cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), this.getState());
    utils.logAndPublishState('Fan P', cfg.getWithMQTTPrefix('mqtt.fanOnDeltaSecsTopic'), this.onMs / 1000);
    utils.logAndPublishState('Fan P', cfg.getWithMQTTPrefix('mqtt.fanOffDeltaSecsTopic'), this.offMs / 1000);
  }
}

import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Fan.prototype, IOPinAccessorsMixin);