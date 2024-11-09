import IOBase from './IOBase.js';
import { Gpio } from 'onoff';
import cfg from '../services/config.js';
import logger from '../services/logger.js';
import * as utils from '../utils/utils.js';
import Event from './event.js';
const logLevel = 'debug';
// const logLevel = 'info';

export default class Fan {
  constructor(name, fanPin) {
    this.IOPin = new IOBase(fanPin, 'out', 0);
    this.setName(name);
    this.setState(false);
    this.setOffMs(cfg.get('fan.offMs'));
    this.setOnMs(cfg.get('fan.onMs'));
    this.setPrevStateChangeMs(Date.now() - this.getOffMs());
    this.on('fanStateChange', this.fanStateEventHandler);
    //set new reading available
    this.setNewStateAvailable(true);

    this.periodicPublishIntervalMs = cfg.get('fan.periodicPublishIntervalMs');
    this.lastPeriodicPublishedMs = Date.now() - this.periodicPublishIntervalMs;
    // this.event = {state: null, action: null, trigger: null, time: null};
  }

  fanStateEventHandler = function (evt) {
    utils.logAndPublishState(evt.description, cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.fanStateTopic'), evt.state ? 1 : 0);
  };

  process() {
    this.manageFan();
    this.periodicPublication();
  }

  periodicPublication() {
    // ensure regular publishing of additional properties
    // such as fanOnMs and fanOffMs
    if (Date.now() >= this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs) {
      this.lastPeriodicPublishedMs = Date.now();
      // fan_on_delta_secs
      utils.logAndPublishState('fanPeriodic', cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.fanOnDeltaSecsTopic'), this.getOnMs() / 1000);
      // fan_off_delta_secs
      utils.logAndPublishState('fanPeriodic', cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.fanOffDeltaSecsTopic'), this.getOffMs() / 1000);
    }
  }

  manageFan() {
    const currentState = this.getState();
    const currentMs = Date.now();
    const elapsedMs = currentMs - this.getPrevStateChangeMs();

    if (currentState == 1) {
      // is it time to turn off?
      if (elapsedMs >= this.getOnMs()) {
        this.toggleFan(0);
      }
    } else {
      // is it time to turn on?
      if (elapsedMs >= this.getOffMs()) {
        this.toggleFan(1);
      }
    }
  }

  toggleFan(state) {
    this.setState(state);
    if (this.hasNewStateAvailable()) {
      if (Gpio.accessible) {
        this.IOPin.writeIO(state);
      } else {
        logger.error('==' + this.getName() + ' IO undefined==');
      }
      if (this.getStateAndClearNewStateFlag() == state) {
        logger.log(logLevel, state ? 'Fan is on' : 'Fan is off');
        const myevent = new Event('toggleFan', state, 'toggleFan', this.getName(), Date.now());
        this.trigger('fanStateChange', myevent);
      }
    }
  }
}

// https://javascript.info/mixins
// Add the mixin with event-related methods
import eventMixin from './mixins/eventMixin.js';
Object.assign(Fan.prototype, eventMixin);

import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Fan.prototype, IOPinAccessorsMixin);
