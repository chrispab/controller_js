import IOBase from './IOBase.js';
import { Gpio } from 'onoff';
import cfg from '../services/config.js';
import logger from '../services/logger.js';
import * as utils from '../utils/utils.js';
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
  }

  fanStateEventHandler = function (evt) {
    utils.logAndPublishState(evt.description, cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), evt.state);
  };

  process() {
    // this.control();
    this.periodicPublication();
  }

  /**
   * Publishes periodic telemetry data for the fan, including its current state,
   * and the configured on/off delta times in seconds.
   */
  periodicPublication() {
    // ensure regular publishing of additional properties
    if (Date.now() >= this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs) {
      this.lastPeriodicPublishedMs = Date.now();
      utils.logAndPublishState('fan P', cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), this.getState());
      // fan_on_delta_secs
      utils.logAndPublishState('fan P', cfg.getWithMQTTPrefix('mqtt.fanOnDeltaSecsTopic'), this.getOnMs() / 1000);
      // fan_off_delta_secs
      utils.logAndPublishState('fan P', cfg.getWithMQTTPrefix('mqtt.fanOffDeltaSecsTopic'), this.getOffMs() / 1000);
    }
  }

  /**
   * Controls the fan's on/off state based on configured on and off durations.
   * If the fan is currently on and its 'on' duration has elapsed, it turns off.
   * If the fan is currently off and its 'off' duration has elapsed, it turns on.
   * The state changes are managed by `toggleFan`.
   */
  control() {
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

  /**
   * Toggles the fan's state (on/off) and emits a 'fanStateChange' event if the state has actually changed.
   *
   * @param {number} state - The desired state for the fan (0 for off, 1 for on).
   */
  toggleFan(state) {
    this.setState(state);
    if (this.hasNewStateAvailable()) {
      if (Gpio.accessible) {
        this.IOPin.writeIO(state);
      } else {
        logger.error('==Fan IO undefined==');
      }
      if (this.getStateAndClearNewStateFlag() == state) {
        logger.log(logLevel, state ? 'Fan is on' : 'Fan is off');
        let evt = { name: 'fanState', state: state, description: 'fan State change: ' };
        this.trigger('fanStateChange', evt);
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
