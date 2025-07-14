import IOBase from './IOBase.js';
import { Gpio } from 'onoff';
import cfg from '../services/config.js';
import logger from '../services/logger.js';
import * as utils from "../utils/utils.js";

const logLevel = 'debug';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default class Light {

  constructor(name, LDRPin, mqttAgent) {
    this.mqttAgent = mqttAgent;
    this.IOPin = new IOBase(LDRPin, 'out', 0);
    this.setName(name);
    this.setState(false);
    this.setPrevStateChangeMs(Date.now());
    this.RCLoopCount = 0;
    this.currentlySamplingLightSensor = false
    this.readLightSensorState();
    this.on('lightStateChange', this.lightStateEventHandler);
    
    this.publishStateIntervalMs = cfg.get('light.publishStateIntervalMs');
    this.lastStatePublishedMs = Date.now() - this.publishStateIntervalMs;
    
    this.sensorReadIntervalMs = cfg.get('light.sensorReadIntervalMs');
    this.lastSensorReadTimeMs = Date.now() - this.sensorReadIntervalMs;

    this.periodicPublishIntervalMs = cfg.get('light.periodicPublishIntervalMs');
    this.lastPeriodicPublishedMs = Date.now() - this.periodicPublishIntervalMs;
  }

  lightStateEventHandler = function (evt) {
    utils.logAndPublishState(this.mqttAgent, evt.description, cfg.getWithMQTTPrefix('mqtt.lightStateTopic'), evt.state);
  };

  process() {
    this.readSensorAtInterval();
    this.periodicPublication();
  }

  readSensorAtInterval() {
    if (Date.now() >= this.lastSensorReadTimeMs + this.sensorReadIntervalMs) {
      logger.log(logLevel, 'READING Light SENSOR STATE: ' + this.getState());
      this.readLightSensorState();
      this.lastSensorReadTimeMs = Date.now();
      if (this.hasNewStateAvailable()) {
        this.lastStatePublishedMs = Date.now();
        let evt = { name: 'state', state: this.getState(), description: 'light sensor read' };

        this.trigger('lightStateChange', evt);
        this.setNewStateAvailable(false);
      }
    }
  }

  periodicPublication() {
    if (Date.now() >= (this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs)) {
      logger.log(logLevel, 'READING REGULAR Light STATE: ' + this.getState());
      let evt = { name: 'state', state: this.getState(), description: 'light P' };

      this.trigger('lightStateChange', evt);
      this.lastStatePublishedMs = Date.now();
      this.lastPeriodicPublishedMs = Date.now();
    }
  }

  getTelemetryData() {
    let superTelemetry = this.getTelemetryData();
    logger.log('debug', `tele light: ${JSON.stringify(superTelemetry)}`);
    return superTelemetry;
  }

  readLightSensorState() {
    logger.log(logLevel, `>>>readLightSensorState this.RCLoopCount: ${this.RCLoopCount}`);
    this.setState(this.RCLoopCount > 1000 ? 0 : 1);
    logger.log(logLevel, `>>>.RCLoopCount: ${this.RCLoopCount}`);

    const lightState = this.getState();
    logger.log(logLevel, `>>>lightState: ${lightState}`);
    this.initiateGetRCChargeLoopCount();
    return this.setState(lightState);
  }

  initiateGetRCChargeLoopCount() {
    this.RCLoopCount = 0;
    if (Gpio.accessible) {
      var self = this;

      wait(50)
        .then(() => this.readLDRChargeLoopCount(self))
        .catch(console.error);
    } else {
      this.RCLoopCount = 111;
      logger.log('error', `DEMO-Gpio not accessible returning default RCLoopCount: ${this.RCLoopCount}`);
    }
    return this.RCLoopCount;
  }

  readLDRChargeLoopCount(self) {
    if (self.currentlySamplingLightSensor == false) {
      self.currentlySamplingLightSensor = true;

      self.setIODirection('in');

      while (self.readIO() == 0 && self.RCLoopCount < 999999) {
        self.RCLoopCount += 1;
      }

      self.setIODirection('out');
      self.writeIO(0);

      logger.log(logLevel, `>>>>>self.getState(): ${self.getState()}`);
      logger.log(logLevel, `>>>>>>>>>>>>>self.RCLoopCount: ${self.RCLoopCount}`);

      self.currentlySamplingLightSensor = false;
    } else {
      logger.log(logLevel, `!! currently SamplingLight Sensor: ${self.currentlySamplingLightSensor}`);
    }
  }
}

import eventMixin from './mixins/eventMixin.js';
Object.assign(Light.prototype, eventMixin);

import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Light.prototype, IOPinAccessorsMixin);