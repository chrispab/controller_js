import IOBase from './IOBase.js';
import { Gpio } from 'onoff';
import cfg from '../services/config.js';
import logger from '../services/logger.js';
// const logLevel = 'info';
const logLevel = 'debug';
// const logLevel = 'warn';
import * as utils from "../utils/utils.js";
// import mqttAgent from "../services/mqttAgent.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default class Light {

  constructor(name, LDRPin) {
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

  lightStateEventHandler = function (state) {
    utils.logAndPublishState("lightStateEvent", cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.lightStateTopic'), state ? 1 : 0);
  };

  process() {
    this.readSensorAtInterval();
    this.periodicPublication();
  }

  readSensorAtInterval() {
    // do an actual read of the sensor every sensorReadIntervalMs
    if (Date.now() >= this.lastSensorReadTimeMs + this.sensorReadIntervalMs) {
      logger.log(logLevel, 'READING Light SENSOR STATE: ' + this.getState());
      this.readLightSensorState();
      this.lastSensorReadTimeMs = Date.now();
      //if its a new value publish it
      if (this.hasNewStateAvailable()) {
        this.lastStatePublishedMs = Date.now();
        this.trigger('lightStateChange', this.getState());
        this.setNewStateAvailable(false);
      }
    }
  }

  periodicPublication() {
    if (Date.now() >= (this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs)) {
      // ensure regular state publishing
      logger.log(logLevel, 'READING REGULAR Light STATE: ' + this.getState());
      this.trigger('lightStateChange', this.getState());
      this.lastStatePublishedMs = Date.now();
      this.lastPeriodicPublishedMs = Date.now();
    }
  }

  getTelemetryData() {
    let superTelemetry = this.getBaseTelemetryData();
    logger.log('debug', `tele light: ${JSON.stringify(superTelemetry)}`); // logger.error(JSON.stringify(superTelemetry));
    return superTelemetry;
  }

  /**
   * Reads the current light sensor state by checking the RCLoopCount.
   * Logs the RCLoopCount and the derived light state.
   * Updates the light state based on the RCLoopCount threshold.
   * Initiates the process to measure the RC charge loop count using GPIO.
   * @returns {void}
   */
  readLightSensorState() {
    logger.log(logLevel, `>>>readLightSensorState this.RCLoopCount: ${this.RCLoopCount}`);
    this.setState(this.RCLoopCount > 1000 ? false : true);
    logger.log(logLevel, `>>>.RCLoopCount: ${this.RCLoopCount}`);

    const lightState = this.getState();
    logger.log(logLevel, `>>>lightState: ${lightState}`);
    // new ldr based routine test
    this.initiateGetRCChargeLoopCount(); // Measure timing using GPIO4
    // this.state = lightState
    return this.setState(lightState);
  }

  /**
   * Triggers a read of the light sensor using a capacitor charge method.
   * This method discharges the capacitor, waits 50ms, and then reads the GPIO pin state.
   * The method returns the loop count required for the voltage across the capacitor to be read as high by the GPIO.
   * If the GPIO is not accessible, the method logs an error and returns a default value of 111.
   * @return {number} The loop count required for the voltage across the capacitor to be read as high by the GPIO.
   */
  initiateGetRCChargeLoopCount() {
    // logger.log(logLevel, '==initiateGetRCChargeLoopCount');
    this.RCLoopCount = 0;
    if (Gpio.accessible) {
      // Discharge capacitor
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

  /**
   * Read the light sensor value by counting the number of loops until the GPIO reads high.
   * The capacitor is charged and then discharged after the measurement is taken.
   * If the sensor is currently being sampled, do nothing.
   * @param {object} self - The context object, 'this'.
   * @returns {undefined}
   */
  readLDRChargeLoopCount(self) {
    // Count loops until voltage across capacitor reads high on GPIO
    // if not currently sampling then start counting
    if (self.currentlySamplingLightSensor == false) {
      self.currentlySamplingLightSensor = true;

      // charge capacitor
      self.setIODirection('in');

      while (self.readIO() == 0 && self.RCLoopCount < 999999) {
        self.RCLoopCount += 1;
      }

      // discharge capacitor
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


// https://javascript.info/mixins

// Add the mixin with event-related methods
import eventMixin from './mixins/eventMixin.js';
Object.assign(Light.prototype, eventMixin);

import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Light.prototype, IOPinAccessorsMixin);

