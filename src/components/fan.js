import IOBase from './IOBase.js';
import { Gpio } from 'onoff';
import cfg from '../services/config.js';
import logger from '../services/logger.js';
import * as utils from '../utils/utils.js';
const logLevel = 'debug';

export default class Fan {
  constructor(name, fanPin, mqttAgent) {
    this.mqttAgent = mqttAgent;
    this.IOPin = new IOBase(fanPin, 'out', 0);
    this.setName(name);
    this.setState(false);
    this.setOffMs(cfg.get('fan.offMs'));
    this.setOnMs(cfg.get('fan.onMs'));
    this.setPrevStateChangeMs(Date.now() - this.getOffMs());
    this.on('fanStateChange', this.fanStateEventHandler);
    this.setNewStateAvailable(true);

    this.periodicPublishIntervalMs = cfg.get('fan.periodicPublishIntervalMs');
    this.lastPeriodicPublishedMs = Date.now() - this.periodicPublishIntervalMs;
  }

  fanStateEventHandler = function (evt) {
    utils.logAndPublishState(this.mqttAgent, evt.description, cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), evt.state);
  };

  process() {
    this.periodicPublication();
  }

  periodicPublication() {
    if (Date.now() >= this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs) {
      this.lastPeriodicPublishedMs = Date.now();
      utils.logAndPublishState(this.mqttAgent, 'fan P', cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), this.getState());
      utils.logAndPublishState(this.mqttAgent, 'fan P', cfg.getWithMQTTPrefix('mqtt.fanOnDeltaSecsTopic'), this.getOnMs() / 1000);
      utils.logAndPublishState(this.mqttAgent, 'fan P', cfg.getWithMQTTPrefix('mqtt.fanOffDeltaSecsTopic'), this.getOffMs() / 1000);
    }
  }

  control() {
    const currentState = this.getState();
    const currentMs = Date.now();
    const elapsedMs = currentMs - this.getPrevStateChangeMs();

    if (currentState == 1) {
      if (elapsedMs >= this.getOnMs()) {
        this.toggleFan(0);
      }
    } else {
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

import eventMixin from './mixins/eventMixin.js';
Object.assign(Fan.prototype, eventMixin);

import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Fan.prototype, IOPinAccessorsMixin);