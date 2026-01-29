import IOPin from './IOPin.js';
import cfg from '../services/config.js';
import logger from '../services/logger.js';
import * as utils from '../utils/utils.js';
import eventEmitter from '../services/eventEmitter.js';

const logLevel = 'warn';

export default class Fan {
  #name;
  #onDurationMs;
  #offDurationMs;

  constructor(name, GPIOfanPinNumber) {
    this.IOPin = new IOPin(GPIOfanPinNumber, 'out', 0);
    this.#name = name;

    this.#onDurationMs=cfg.get('fan.onDurationMs');
    this.#offDurationMs=cfg.get('fan.offDurationMs');

    this.lastStateChangeMs = Date.now() - this.getOffDurationMs(); // Assume it was off before starting

    // const periodicPublishIntervalMs = cfg.get('fan.periodicPublishIntervalMs');

    // Start autonomous operation
    setInterval(() => this.controlCycle(), 1000); // Check every second
    // setInterval(() => this.periodicPublication(), periodicPublishIntervalMs);

    this.updateState(0); // Ensure initial state is set and published
  }


  setOnDurationMs(newOnDurationMs) {
    const currentOnDurationMs = this.getOnDurationMs();
    if (currentOnDurationMs !== newOnDurationMs) {
      this.#onDurationMs = newOnDurationMs;
      eventEmitter.emit('fan/on-duration-changed', {
        name: this.getName(),
        onMs: newOnDurationMs,
      });
    }
  }

  getOnDurationMs() {
    return this.#onDurationMs;
  }

  setOffDurationMs(newOffDurationMs) {
    const currentOffDurationMs = this.getOffDurationMs();
    if (currentOffDurationMs !== newOffDurationMs) {
      this.#offDurationMs = newOffDurationMs;
      eventEmitter.emit('fan/off-duration-changed', {
        name: this.getName(),
        onMs: newOffDurationMs,
      });
    }
  }

  getOffDurationMs() {
    return this.#offDurationMs;
  }

  controlCycle() {
    // Refresh settings from config in case they changed
    this.setOnDurationMs(cfg.get('fan.onDurationMs'));
    this.setOffDurationMs(cfg.get('fan.offDurationMs'));

    try {
      const elapsedMs = Date.now() - this.lastStateChangeMs;

      if (this.getState() === 1) {
        // Fan is ON
        if (elapsedMs >= this.getOnDurationMs()) {
          this.updateState(0); // Turn OFF
        }
      } else {
        // Fan is OFF
        if (elapsedMs >= this.getOffDurationMs()) {
          this.updateState(1); // Turn ON
        }
      }
    } catch (error) {
      logger.error(`Error in Fan controlCycle for ${this.getName()}: ${error.message}`, { stack: error.stack });
    }
  }

  setName(name) {
    this.#name = name;
  }

  getName() {
    return this.#name;
  }


  // setState(newState) {
  //   this.IOPin.setState(newState);
  // }

  getState() {
    return this.IOPin.getState();
  }


  updateState(newState) {
    const currentState = this.getState();

    if (newState !== currentState) {

      
      this.IOPin.writeIO(newState ? 1 : 0);//also updates IOPin state prop
      this.lastStateChangeMs = Date.now();

      // Emit fan/ events on the central bus
      if (newState) {
        eventEmitter.emit('fan/started', { name: this.getName(), newState: newState ? 1 : 0 });
      } else {
        eventEmitter.emit('fan/stopped', { name: this.getName(), newState: newState ? 1 : 0 });
      }
    }
  }

  // get current state of all fan props used in controller
  // return 


  // periodicPublication() {
  //   // Reload settings in case they were changed in config file
  //   this.setOnDurationMs(cfg.get('fan.onMs'));
  //   this.setOffDurationMs(cfg.get('fan.offMs'));

  //   // Publish current state and settings periodically
  //   utils.logAndPublishState('Fan P', cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), this.getState());
  //   utils.logAndPublishState('Fan P', cfg.getWithMQTTPrefix('mqtt.fanOnDurationSecsTopic'), this.getOnDurationMs() / 1000);
  //   utils.logAndPublishState('Fan P', cfg.getWithMQTTPrefix('mqtt.fanOffDurationSecsTopic'), this.getOffDurationMs() / 1000);
  // }


}

// import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
// Object.assign(Fan.prototype, IOPinAccessorsMixin);
