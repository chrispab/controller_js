import IOBase from './IOBase.js';
import cfg from '../services/config.js';
import logger from '../services/logger.js';
import { Gpio } from 'onoff';

import * as utils from '../utils/utils.js';

const logLevel = 'warn';

class Heater {
  constructor(name, heaterPin, mqttAgent) {
    this.mqttAgent = mqttAgent;
    this.IOPin = new IOBase(heaterPin, 'out', 0);
    this.setName(name);
    this.heater_sp_offset = cfg.get('heater.heater_sp_offset');
    this.heatingCycleState = 'INACTIVE';
    this.on('heaterStateChange', this.heaterStateEventHandler);
    this.ExternalTDiffMs = cfg.get('heater.ExternalTDiffMs');
  }

  heaterStateEventHandler = function (evt) {
    utils.logAndPublishState(this.mqttAgent, evt.description, cfg.getWithMQTTPrefix('mqtt.heaterStateTopic'), evt.state);
  };

  process() {
    this.processCount = this.processCount ? this.processCount + 1 : 1;
  }

  control(currentTemp, setPointTemperature, lightState, outsideTemp = 10) {
    const currentMs = Date.now();
    if (lightState == true) {
      this.toggleHeater(0);
      return;
    }
    this.heatOffMs = cfg.get('heater.heatOffMs');
    if (currentTemp >= setPointTemperature + this.heater_sp_offset) {
      if (this.heatingCycleState === 'INACTIVE') {
        this.toggleHeater(0);
      }
    }
    if (currentTemp < setPointTemperature + this.heater_sp_offset) {
      if (this.heatingCycleState === 'INACTIVE') {
        let externalDiffT = (setPointTemperature - outsideTemp) * this.ExternalTDiffMs;
        logger.log(logLevel, `setPointTemperature:${setPointTemperature} outsideTemp:${outsideTemp} externalDiffT:${externalDiffT}`);
        logger.log(logLevel, `--EXTERNAL DIFF t delta on to add ms:${externalDiffT}`);

        this.heatOnMs = cfg.get('heater.heatOnMs') + externalDiffT;
        this.heatOffMs = cfg.get('heater.heatOffMs');
        logger.log(logLevel, `>>CALCULATED TOTAL delta ON ms:this.heatOnMs:${this.heatOnMs}`);

        this.heatingCycleState = 'ON';
        this.toggleHeater(1);
        logger.log(logLevel, '..temperature low - currently INACTIVE - TURN HEATing cycle state ON');
      }
    } else {
      this.toggleHeater(0);
    }
    if (this.heatingCycleState == 'ON') {
      if (currentMs - this.getPrevStateChangeMs() >= this.heatOnMs) {
        this.heatingCycleState = 'OFF';
        this.toggleHeater(0);
        logger.log(logLevel, '..currently ON - TURN HEATing cycle state OFF');
      }
    }

    this.heatOffMs = cfg.get('heater.heatOffMs');
    if (this.heatingCycleState == 'OFF') {
      if (currentMs - this.getPrevStateChangeMs() >= this.heatOffMs) {
        this.heatingCycleState = 'INACTIVE';
        logger.log(logLevel, '..currently OFF - MAKE HEATing cycle state INACTIVE');
        this.toggleHeater(0);
      }
    }
  }

  getTelemetryData() {
    let telemetry = this.getTelemetryData();
    logger.log('debug', `Tele heater: ${JSON.stringify(telemetry)}`);
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

        let evt = { name: 'heaterState', state: state, description: 'heater State' };

        this.trigger('heaterStateChange', evt);
      }
    }
  }
}

import eventMixin from './mixins/eventMixin.js';
Object.assign(Heater.prototype, eventMixin);

import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Heater.prototype, IOPinAccessorsMixin);

export default Heater;