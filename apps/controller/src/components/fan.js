import IOBase from './IOBase.js';
import { Gpio } from 'onoff';
import cfg from '../services/config.js';
import logger from '../services/logger.js';
import eventEmitter from '../services/eventEmitter.js';
import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';

const logLevel = 'debug';

export default class Fan {
  constructor(name, fanPin) {
    this.IOPin = new IOBase(fanPin, 'out', 0);
    this.setName(name);
    this.setState(false);
    this.onMs = cfg.get('fan.onMs');
    this.offMs = cfg.get('fan.offMs');

    // Start periodic control
    setInterval(() => this.control(), 1000); // Check every second
  }

  control() {
    const currentState = this.getState();
    const elapsedMs = Date.now() - this.getPrevStateChangeMs();

    if (currentState === true) {
      if (elapsedMs >= this.onMs) {
        this.toggleFan(false);
      }
    } else {
      if (elapsedMs >= this.offMs) {
        this.toggleFan(true);
      }
    }
  }

  toggleFan(state) {
    this.setState(state);
    if (this.hasNewStateAvailable()) {
      if (Gpio.accessible) {
        this.IOPin.writeIO(state ? 1 : 0);
      } else {
        logger.error('==Fan IO undefined==');
      }
      logger.log(logLevel, state ? 'Fan is on' : 'Fan is off');
      eventEmitter.emit('fanStateChanged', this.getState());
    }
  }

  process() {
    // The process method is no longer needed for control logic,
    // but can be kept for other periodic tasks if necessary.
  }
}

// Add the mixin with accessor methods
Object.assign(Fan.prototype, IOPinAccessorsMixin);