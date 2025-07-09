import IOBase from './IOBase.js';
import cfg from '../services/config.js';
import logger from '../services/logger.js';
import { Gpio } from 'onoff';
// import Event from './event.js';

import * as utils from '../utils/utils.js';

// const logLevel = 'debug';
const logLevel = 'warn';

class Heater {
  constructor(name, heaterPin) {
    this.IOPin = new IOBase(heaterPin, 'out', 0);
    this.setName(name);
    this.heater_sp_offset = cfg.get('heater.heater_sp_offset');
    this.heatingCycleState = 'INACTIVE';
    this.on('heaterStateChange', this.heaterStateEventHandler);
    this.ExternalTDiffMs = cfg.get('heater.ExternalTDiffMs');
  }

  heaterStateEventHandler = function (evt) {
    utils.logAndPublishState(evt.description, cfg.getWithMQTTPrefix('mqtt.heaterStateTopic'), evt.state);
  };

  process() {
    this.processCount = this.processCount ? this.processCount + 1 : 1;
  }

  control(currentTemp, setPointTemperature, lightState, outsideTemp = 10) {
    // logger.log('warn',`currentTemp:${currentTemp}, outsideTemp:${outsideTemp}, setPointTemperature:${setPointTemperature} lightState:${lightState}`);
    const currentMs = Date.now();
    // logger.log('warn', '==Heat ctl==');
    // Calculate new heater on time based on temperature gap
    // this.heatOnMs = ((setPointTemperature - currentTemp) * 20 * 1000) + cfg.getItemValueFromConfig('heatOnMs');
    if (lightState == true) {
      // this.turnOff();
      this.toggleHeater(0);
      return;
    }
    // light is off
    this.heatOffMs = cfg.get('heater.heatOffMs');
    // logger.log('warning', '..light off..do heat ctl');
    // logger.log('warning', 'self.heatingCycleState:', this.heatingCycleState);
    if (currentTemp >= setPointTemperature + this.heater_sp_offset) {
      if (this.heatingCycleState === 'INACTIVE') {
        // this.turnOff();
        this.toggleHeater(0);
      }
    }
    // Just trigger a defined ON period - force it to complete
    // Then force a defined OFF period - force it to complete
    // Is an on or off pulse active?
    if (currentTemp < setPointTemperature + this.heater_sp_offset) {
      if (this.heatingCycleState === 'INACTIVE') {
        //! Look at on period based on external temperature
        // Extra heater time based on difference from set point per 0.1 degree difference
        // let internalDiffT = Math.floor(((setPointTemperature - currentTemp) * 10 * this.InternalTDiffMs));
        // logger.log('warning', '--INTERNAL DIFF extra time to add ms:', internalDiffT);

        // Extra heater time based on external temperature difference
        // Do if external diff is >2 deg C
        if (outsideTemp === null) {
          outsideTemp = 10;
        }
        // let externalDiffT = Math.floor((setPointTemperature - 2 - outsideTemp) * this.ExternalTDiffMs);
        // Milliseconds per degree diff
        // let externalDiffT = Math.floor((setPointTemperature - outsideTemp) * this.ExternalTDiffMs);
        let externalDiffT = (setPointTemperature - outsideTemp) * this.ExternalTDiffMs;
        logger.log(logLevel, `setPointTemperature:${setPointTemperature} outsideTemp:${outsideTemp} externalDiffT:${externalDiffT}`);
        logger.log(logLevel, `--EXTERNAL DIFF t delta on to add ms:${externalDiffT}`);

        // this.heatOnMs = cfg.getItemValueFromConfig('heatOnMs') + internalDiffT + externalDiffT; // + (outsideTemp / 50);
        this.heatOnMs = cfg.get('heater.heatOnMs') + externalDiffT; // + (outsideTemp / 50);
        this.heatOffMs = cfg.get('heater.heatOffMs');
        logger.log(logLevel, `>>CALCULATED TOTAL delta ON ms:this.heatOnMs:${this.heatOnMs}`);

        // Start a cycle - ON first
        this.heatingCycleState = 'ON';
        // Init ON state timer
        // this.turnOn();
        this.toggleHeater(1);
        logger.log(logLevel, '..temperature low - currently INACTIVE - TURN HEATing cycle state ON');
      }
    } else {
      this.toggleHeater(0);
    }
    if (this.heatingCycleState == 'ON') {
      if (currentMs - this.getPrevStateChangeMs() >= this.heatOnMs) {
        this.heatingCycleState = 'OFF';
        // this.turnOff();
        this.toggleHeater(0);
        logger.log(logLevel, '..currently ON - TURN HEATing cycle state OFF');
      }
    }

    this.heatOffMs = cfg.get('heater.heatOffMs');
    if (this.heatingCycleState == 'OFF') {
      if (currentMs - this.getPrevStateChangeMs() >= this.heatOffMs) {
        this.heatingCycleState = 'INACTIVE';
        logger.log(logLevel, '..currently OFF - MAKE HEATing cycle state INACTIVE');
        // this.turnOff();
        this.toggleHeater(0);
      }
    }
  }

  getTelemetryData() {
    let telemetry = this.getTelemetryData();
    logger.log('debug', `Tele heater: ${JSON.stringify(telemetry)}`); // logger.error(JSON.stringify(superTelemetry));
    return telemetry;
  }

  toggleHeater(state) {
    this.setState(state);
    if (this.hasNewStateAvailable()) {
      if (Gpio.accessible) {
        this.writeIO(state);
      } else {
        logger.error('==' + this.getName() + ' IO undefined==');
      }
      if (this.getStateAndClearNewStateFlag() == state) {
        logger.log(logLevel, state ? 'Heater is on' : 'Heater is off');

        // let evt = new Event('toggleHeater', this.getState(),'state');
        let evt = { name: 'heaterState', state: state, description: 'heater State' };

        this.trigger('heaterStateChange', evt);

        // evt = new Event('toggleHeater', this.getS(), 'speed', this.getState());

      }
    }
  }
}

// https://javascript.info/mixins
// Add the mixin with event-related methods
import eventMixin from './mixins/eventMixin.js';
Object.assign(Heater.prototype, eventMixin);

import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Heater.prototype, IOPinAccessorsMixin);

export default Heater;
