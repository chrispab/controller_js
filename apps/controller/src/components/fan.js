import IOBase from './IOBase.js';
import dataStore from '../services/dataStore.js';
import logger from '../services/logger.js';
import * as utils from '../utils/utils.js';
import eventEmitter from '../services/eventEmitter.js';

const logLevel = 'warn';

export default class Fan {
  constructor(name, fanPin) {
    this.IOPin = new IOBase(fanPin, 'out', 0);
    this.setName(name);
    this.setOnMs(dataStore.get('config.fan.onMs'));
    this.setOffMs(dataStore.get('config.fan.offMs'));
    this.prevStateChangeMs = Date.now() - this.getOffMs(); // Assume it was off before starting

    const periodicPublishIntervalMs = dataStore.get('config.fan.periodicPublishIntervalMs');

    // Start autonomous operation
    setInterval(() => this.controlCycle(), 1000); // Check every second
    setInterval(() => this.periodicPublication(), periodicPublishIntervalMs);

    this.updateState(false); // Ensure initial state is set and published
  }

  controlCycle() {
    try {
      const elapsedMs = Date.now() - this.prevStateChangeMs;

      if (this.getState() === true) {
        // Fan is ON
        if (elapsedMs >= this.getOnMs()) {
          this.updateState(false); // Turn OFF
        }
      } else {
        // Fan is OFF
        if (elapsedMs >= this.getOffMs()) {
          this.updateState(true); // Turn ON
        }
      }
    } catch (error) {
      logger.error(`Error in Fan controlCycle for ${this.getName()}: ${error.message}`, { stack: error.stack });
    }
  }

  updateState(newState) {
    const oldState = this.getState();
    if (newState !== oldState) {
      // This now calls the mixin's setState, which updates the IOPin's state
      this.setState(newState);
      this.prevStateChangeMs = Date.now();

      this.IOPin.writeIO(newState ? 1 : 0);

      // Emit specific events on the central bus
      if (newState) {
        eventEmitter.emit('fan/started', { name: this.getName(), newState: newState });
      } else {
        eventEmitter.emit('fan/stopped', { name: this.getName(), newState: newState });
      }

    }
  }

  periodicPublication() {
    // Reload settings in case they were changed in config file
    this.setOnMs(dataStore.get('config.fan.onMs'));
    this.setOffMs(dataStore.get('config.fan.offMs'));

    // Publish current state and settings periodically
    utils.logAndPublishState('Fan P', dataStore.getWithMQTTPrefix('config.mqtt.fanStateTopic'), this.getState());
    utils.logAndPublishState('Fan P', dataStore.getWithMQTTPrefix('config.mqtt.fanOnDurationSecsTopic'), this.getOnMs() / 1000);
    utils.logAndPublishState('Fan P', dataStore.getWithMQTTPrefix('config.mqtt.fanOffDurationSecsTopic'), this.getOffMs() / 1000);
  }
}

import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Fan.prototype, IOPinAccessorsMixin);

// Override setOnMs and setOffMs to emit events
const originalSetOnMs = Fan.prototype.setOnMs;
Fan.prototype.setOnMs = function (newOnMs) {
  const oldOnMs = this.getOnMs();
  if (oldOnMs !== newOnMs) {
    originalSetOnMs.call(this, newOnMs);
    eventEmitter.emit('fan/on-duration-changed', {
      name: this.getName(),
      onMs: newOnMs,
    });
  }
};

const originalSetOffMs = Fan.prototype.setOffMs;
Fan.prototype.setOffMs = function (newOffMs) {
  const oldOffMs = this.getOffMs();
  if (oldOffMs !== newOffMs) {
    originalSetOffMs.call(this, newOffMs);
    eventEmitter.emit('fan/off-duration-changed', {
      name: this.getName(),
      offMs: newOffMs,
    });
  }
};
