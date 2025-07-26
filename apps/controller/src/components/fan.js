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
    this.setOnMs(cfg.get('fan.onMs'));
    this.setOffMs(cfg.get('fan.offMs'));
    this.prevStateChangeMs = Date.now() - this.getOffMs(); // Assume it was off before starting

    const periodicPublishIntervalMs = cfg.get('fan.periodicPublishIntervalMs');

    // Start autonomous operation
    setInterval(() => this.controlCycle(), 1000); // Check every second
    setInterval(() => this.periodicPublication(), periodicPublishIntervalMs);

    this.updateState(false); // Ensure initial state is set and published
  }

  
  controlCycle() {
    const elapsedMs = Date.now() - this.prevStateChangeMs;

    if (this.getState() === true) { // Fan is ON
      if (elapsedMs >= this.getOnMs()) {
        this.updateState(false); // Turn OFF
      }
    } else { // Fan is OFF
      if (elapsedMs >= this.getOffMs()) {
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

      // logger.log(logLevel, `>>>>>>>>${this.getName()} is ${newState ? 'ON' : 'OFF'}`);
      // logger.log(logLevel, `--------this.IOPin.writeIO(newState ? 1 : 0) - ${this.getName()} is ${newState ? 1 : 0}`);

      // Emit event on central bus
      eventEmitter.emit('fanStateChanged', { name: this.name, state: newState });

      // Publish state change to MQTT
      utils.logAndPublishState('Fan update', cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), newState ? 1 : 0);
    }
  }

  periodicPublication() {
    // Reload settings in case they were changed in config file
    this.setOnMs(cfg.get('fan.onMs'));
    this.setOffMs(cfg.get('fan.offMs'));
    //  = cfg.get('fan.onMs');
    // this.offMs = cfg.get('fan.offMs');

    // Publish current state and settings periodically
    utils.logAndPublishState('Fan P', cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), this.getState());
    utils.logAndPublishState('Fan P', cfg.getWithMQTTPrefix('mqtt.fanOnDurationSecsTopic'), this.getOnMs() / 1000);
    utils.logAndPublishState('Fan P', cfg.getWithMQTTPrefix('mqtt.fanOffDurationSecsTopic'), this.getOffMs() / 1000);
  }
}

import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Fan.prototype, IOPinAccessorsMixin);