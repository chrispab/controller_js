import IOBase from './IOBase.js';
import cfg from '../services/config.js';
import logger from '../services/logger.js';
import { Gpio } from 'onoff';
import eventEmitter from '../services/eventEmitter.js';
import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';

const logLevel = 'debug';

class Heater {
  constructor(name, heaterPin) {
    this.IOPin = new IOBase(heaterPin, 'out', 0);
    this.setName(name);
    this.heater_sp_offset = cfg.get('heater.heater_sp_offset');
    this.heatingCycleState = 'INACTIVE';
    this.ExternalTDiffMs = cfg.get('heater.ExternalTDiffMs');
  }

  process() {
    // The process method is no longer needed for control logic,
    // but can be kept for other periodic tasks if necessary.
  }

  control(currentTemp, setPointTemperature, lightState, outsideTemp = 10) {
    const currentMs = Date.now();

    if (lightState === true) {
      this.toggleHeater(0);
      return;
    }

    const setpoint = setPointTemperature + this.heater_sp_offset;

    if (this.heatingCycleState === 'INACTIVE') {
      if (currentTemp < setpoint) {
        const externalDiffT = (setPointTemperature - outsideTemp) * this.ExternalTDiffMs;
        this.heatOnMs = cfg.get('heater.heatOnMs') + externalDiffT;
        this.heatOffMs = cfg.get('heater.heatOffMs');
        
        logger.debug(`>>CALCULATED TOTAL delta ON ms:this.heatOnMs:${this.heatOnMs}`);
        this.heatingCycleState = 'ON';
        this.toggleHeater(1);
        logger.debug('..temperature low - currently INACTIVE - TURN HEATING cycle state ON');
      }
    } else if (this.heatingCycleState === 'ON') {
      if (currentMs - this.getPrevStateChangeMs() >= this.heatOnMs) {
        this.heatingCycleState = 'OFF';
        this.toggleHeater(0);
        logger.debug('..currently ON - TURN HEATING cycle state OFF');
      }
    } else if (this.heatingCycleState === 'OFF') {
      if (currentMs - this.getPrevStateChangeMs() >= this.heatOffMs) {
        this.heatingCycleState = 'INACTIVE';
        this.toggleHeater(0);
        logger.debug('..currently OFF - MAKE HEATING cycle state INACTIVE');
      }
    }
  }

  toggleHeater(state) {
    this.setState(state);
    if (this.hasNewStateAvailable()) {
      if (Gpio.accessible) {
        this.writeIO(state ? 1 : 0);
      } else {
        logger.error('==' + this.getName() + ' IO undefined==');
      }
      if (this.getStateAndClearNewStateFlag() === state) {
        logger.debug(state ? 'Heater is on' : 'Heater is off');
        eventEmitter.emit('heaterStateChanged', this.getState());
      }
    }
  }
}

// Add the mixin with accessor methods
Object.assign(Heater.prototype, IOPinAccessorsMixin);

export default Heater;
