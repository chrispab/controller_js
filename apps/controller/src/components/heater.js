import IOBase from './IOBase.js';
import cfg from '../services/config.js';
import logger from '../services/logger.js';
import { Gpio } from 'onoff';
import * as utils from '../utils/utils.js';
import eventEmitter from '../services/eventEmitter.js';

const logLevel = 'debug';

export default class Heater {
  constructor(name, heaterPin) {
    this.IOPin = new IOBase(heaterPin, 'out', 0);
    this.setName(name);
    this.heatingCycleState = 'INACTIVE'; // INACTIVE, ON, OFF
    this.lastStateChangeMs = 0;
    this.heatOnMs = 0;
    this.heatOffMs = cfg.get('heater.heatOffMs');
    this.heater_sp_offset = cfg.get('heater.heater_sp_offset');
    this.ExternalTDiffMs = cfg.get('heater.ExternalTDiffMs');
    this.allowHeatingWithLightOn = cfg.get('heater.allowHeatingWithLightOn');

    // -- Current environmental state --
    this.currentTemp = 20; // Start with a default value until we get real readings
    this.lightState = false;
    this.outsideTemp = 10;

    // -- Event Listeners --
    eventEmitter.on('temperatureChanged', ({ temperature }) => {
      this.currentTemp = temperature;
      // this.controlLogic();
    });
    eventEmitter.on('lightStateChanged', ({ lightState }) => {
      this.lightState = lightState;
      // this.controlLogic();
    });
    eventEmitter.on('outsideTemperatureChanged', ({ outsideTemperature }) => {
      this.outsideTemp = outsideTemperature;
      // this.controlLogic();
    });

    //initil state
    utils.logAndPublishState('Heater', cfg.getWithMQTTPrefix('mqtt.heaterStateTopic'), this.getState() ? 1 : 0);
    // Start autonomous cycle checking
    this.controlLogic(); // Run immediately to set initial state based on current conditions
   setTimeout(() => {
    eventEmitter.emit('heaterStateChanged', {
      name: this.name,
      state: this.getState() ? 1 : 0,
    });
  }, 10000);
  
    // utils.logAndPublishState('Heater', cfg.getWithMQTTPrefix('mqtt.heaterStateTopic'), this.getState() ? 1 : 0);
    setInterval(() => this.controlLogic(), cfg.get('heater.controlMethodIntervalMs')); // do control every n milliseconds
  }

  updateState(newState) {
    const oldState = this.getState();
    if (newState !== oldState) {
      this.setState(newState);
      this.lastStateChangeMs = Date.now();
      this.IOPin.writeIO(newState ? 1 : 0);
      logger.log(logLevel, `${this.getName()} is ${newState ? 'ON' : 'OFF'}`);
      eventEmitter.emit('heaterStateChanged', {
        name: this.name,
        state: newState ? 1 : 0,
      });
      utils.logAndPublishState('Heater', cfg.getWithMQTTPrefix('mqtt.heaterStateTopic'), newState ? 1 : 0);
    }
  }

  controlLogic() {
    if (this.currentTemp === null) {
      logger.warn('Current temperature is unknown. Skipping heater control logic.');
      return;
    }
    // let setPoint = this.lightState
    //   ? cfg.get('zone.highSetpoint')
    //   : cfg.get('zone.lowSetpoint');
    // const currentMs = Date.now();

    // if (this.lightState === true) {
    //   this.updateState(false); // Heater is always off when light is on
    //   this.heatingCycleState = 'INACTIVE';
    //   return;
    // }
    // if (this.lightState === true && this.currentTemp < cfg.get('zone.lowSetpoint')) {
    //   this.updateState(false); // Heater is always off when light is on
    //   this.heatingCycleState = 'INACTIVE';
    //   // return;
    // setPoint = cfg.get('zone.lowSetpoint');
    // if temperature is below low setpoint, allow heating even if light is on, but use low setpoint as target
    if (this.currentTemp < cfg.get('zone.lowSetpoint')) {
      logger.debug(' Allowing heating to reach low setpoint.');
      this.updateState(true);
      return;
    } else {
      this.updateState(false);
      this.heatingCycleState = 'INACTIVE';
      return;
    }

    // }
    // --- Main Heating Logic (only runs when light is OFF) ---
    let diffFromSetPoint = this.currentTemp - setPoint;
    // if negative make it zero
    if (diffFromSetPoint < 0) diffFromSetPoint = 0;

    switch (this.heatingCycleState) {
      case 'INACTIVE':
        if (this.currentTemp < setPoint + this.heater_sp_offset) {
          // Temperature is below setpoint, start a heating cycle
          const externalDiffT = (setPoint - this.outsideTemp) * this.ExternalTDiffMs;
          this.heatOnMs = diffFromSetPoint * 10 + (cfg.get('heater.heatOnMs') + externalDiffT);
          logger.debug(`New heating cycle. Calculated ON time: ${this.heatOnMs}ms`);
          this.heatOffMs = cfg.get('heater.heatOffMs') - externalDiffT;
          if (this.heatOffMs < 0) this.heatOffMs = 0; // Ensure off time doesn't go negative
          this.heatingCycleState = 'ON';
          this.updateState(true);
        }
        break;

      case 'ON':
        if (currentMs - this.lastStateChangeMs >= this.heatOnMs) {
          // On-time has elapsed, switch to OFF period
          this.heatingCycleState = 'OFF';
          this.updateState(false);
        }
        break;

      case 'OFF':
        if (currentMs - this.lastStateChangeMs >= this.heatOffMs) {
          // Off-time has elapsed, cycle is complete
          this.heatingCycleState = 'INACTIVE';
        }
        break;
    }

    // Safety check: if temperature rises above setpoint, force everything off.
    if (this.currentTemp >= setPoint + this.heater_sp_offset) {
      if (this.heatingCycleState !== 'INACTIVE') {
        logger.debug('Temperature is above setpoint. Forcing heater OFF and cycle to INACTIVE.');
        this.heatingCycleState = 'INACTIVE';
      }
      this.updateState(false);
    }
  }
}
import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Heater.prototype, IOPinAccessorsMixin);
