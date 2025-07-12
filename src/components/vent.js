import IOBase from './IOBase.js';
import logger from '../services/logger.js';
import { Gpio } from 'onoff';
import cfg from '../services/config.js';
import * as utils from '../utils/utils.js';

const logLevel = 'debug';
// const logLevel = 'warn';

export default class Vent {
  constructor(name, ventPowerPin, ventSpeedPin) {
    this.IOPin = new IOBase(ventPowerPin, 'dummy vent', 0);
    this.setState(false); //0, 1 or 2. 0%, 50%, 100%. off,medium,full
    this.setName(name);
    // two Pins, on/off and speed 50-100%
    this.ventPowerPin = new IOBase(ventPowerPin, 'out', 0);
    this.ventPowerPin.setState(false);
    this.ventSpeedPin = new IOBase(ventSpeedPin, 'out', 0);
    this.ventSpeedPin.setState(false);

    this.setOnMs(cfg.get('vent.onMs'));
    this.setOffMs(cfg.get('vent.offMs'));
    this.setPrevStateChangeMs(Date.now() - this.getOffMs());
    this.ventOnDarkMs = cfg.get('vent.ventOnDarkMs'); // vent on time
    this.ventOffDarkMs = cfg.get('vent.ventOffDarkMs'); // vent off time
    this.ventDarkOnStartMs = 0;
    this.ventDarkOffStartMs = 0;
    this.speedPercent = cfg.get('vent.speedPercent');
    this.lightOnSetpointOffset = cfg.get('vent.lightOnSetpointOffset');
    this.ventOverride = false;
    this.ventDarkStatus = 'inactive';
    this.setNewStateAvailable(true);
    this.ventOverridePulseOnDelta = cfg.get('vent.ventOverridePulseOnDelta');

    this.periodicPublishIntervalMs = cfg.get('vent.periodicPublishIntervalMs');
    this.lastPeriodicPublishedMs = Date.now() - this.periodicPublishIntervalMs;

    // this.publishStateIntervalMs = cfg.get('vent.publishStateIntervalMs');
    // this.lastStatePublishedMs = Date.now() - this.publishStateIntervalMs;
    this.on('ventStateChange', this.ventStateEventHandler);
  }

  /**
   * Handles the 'ventStateChange' event by logging and publishing the vent's state to the appropriate MQTT topic.
   *
   * @param {object} evt - The event object containing the name, state, and description of the vent's state change.
   */
  ventStateEventHandler = function (evt) {
    let topic = null;
    if (evt.name === 'state') {
      topic = cfg.getWithMQTTPrefix('mqtt.ventStateTopic');
    } else if (evt.name === 'speedState') {
      topic = cfg.getWithMQTTPrefix('mqtt.ventSpeedStateTopic');
    } else if (evt.name === 'speedPercent') {
      topic = cfg.getWithMQTTPrefix('mqtt.ventSpeedPercentTopic');
    } else if (evt.name === 'value') {
      topic = cfg.getWithMQTTPrefix('mqtt.ventValueTopic');
    }
    logger.log(logLevel, "ventStateEventHandler: evt.name  " + evt.name );

    if (topic) {
      utils.logAndPublishState(evt.description, topic, evt.state);
    } else {
      logger.warn(`ventStateEventHandler: unknown evt.name: ${evt.name}`);
    }
    logger.log(logLevel,"topic: " + topic + " evt.state: "+ evt.state);
  };


  process() {
    this.processPeriodicPublication();
  }

  /**
   * Publishes periodic telemetry data for the vent, including on/off delta times for both light and dark conditions.
   * This ensures that the vent's configuration parameters are regularly updated to the MQTT broker.
   */
  processPeriodicPublication() {
    if (Date.now() >= this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs) {
      this.lastPeriodicPublishedMs = Date.now();

      utils.logAndPublishState('vent P ', cfg.getWithMQTTPrefix('mqtt.ventOnDeltaSecsTopic'), `${this.getOnMs() / 1000}`);
      utils.logAndPublishState('vent P ', cfg.getWithMQTTPrefix('mqtt.ventOffDeltaSecsTopic'), `${this.getOffMs() / 1000}`);
      utils.logAndPublishState('vent P ', cfg.getWithMQTTPrefix('mqtt.ventOnDarkSecsTopic'), `${this.ventOnDarkMs / 1000}`);
      utils.logAndPublishState('vent P ', cfg.getWithMQTTPrefix('mqtt.ventOffDarkSecsTopic'), `${this.ventOffDarkMs / 1000}`);
    }
  }

  control(currentTemp, setPointTemperature, lightState) {
    // logger.warn(`temperature: ${(Math.round(currentTemp * 100) / 100).toFixed(1)}, target: ${setPointTemperature}, light: ${lightState}`);
    if (lightState == true){
      this.lightVentControl(currentTemp, setPointTemperature);
    } else {
      this.darkVentControl();
    }
  }

  darkVentControl(currentTemp, setPointTemperature) {
    const currentMs = Date.now();
    const elapsedMsSinceLastStateChange = currentMs - this.getPrevStateChangeMs();
    // const lowerHys = setPointTemperature - 0.1;
    // const upperHys = setPointTemperature + 0.2;
    // maybe use a dead band?
    // if (this.speedPercent == 100) {
    //   if (currentTemp > lowerHys) {
    //     this.speedPercent == 100  // high speed - leave on
    //   } else {  // (currentTemp < lowerHys):
    //     this.speedPercent == 50  // lo speed
    //   }
    // } else {  // speedstate is OFFt
    //   if (currentTemp < upperHys) {
    //     this.speedPercent == 50  // high speed - leave on
    //   } else {  // (currentTemp > upperHys):
    //     this.speedPercent == 100  // lo speed
    //   }
    // }
    // logger.warn(`temperature: ${(Math.round(currentTemp * 100) / 100).toFixed(1)}, target: ${setPointTemperature}, light: ${lightState}, millis: ${currentMs}`);
    // temperature above target, change state to ON, full speed
    if (currentTemp > setPointTemperature + this.lightOnSetpointOffset) {
      this.ventOverride = true;
      // this.speedPercent = 100;
      this.turnOn(100);
      logger.log(logLevel, 'VENT ON - HI TEMP OVERRIDE - (Re)Triggering cooling pulse');
    } else if (this.ventOverride == true && elapsedMsSinceLastStateChange >= this.ventOverridePulseOnDelta) {
      // temperature below target, change state to OFF after pulse delay
      this.speedPercent = 0;
      this.turnOff();
      this.ventOverride = false;
      logger.log(logLevel, 'VENT OFF - temperature ok, OVERRIDE - OFF');
    } else if (this.ventOverride == true) {
      logger.log(logLevel, 'VENT ON - override in progress');
    }
    // periodic vent control - only execute if vent override not active
    if (this.ventOverride == false) {
      // process periodic vent activity
      // logger.warn("---6");
      if (this.getState() == false) {
        // if the vent is off, we must wait for the interval to expire before turning it on
        // if time is up, so change the state to ON
        if (elapsedMsSinceLastStateChange >= this.getOffMs()) {
          // this.speedPercent = 50;
          this.turnOn(50);
          logger.log(logLevel, 'VENT ON cycle start');
        } else {
          logger.log(logLevel, 'Vent OFF - during cycle OFF period');
        }
      } else {
        // vent is on, we must wait for the 'on' duration to expire before
        // turning it off
        // time up, change state to OFF
        if (elapsedMsSinceLastStateChange >= this.getOnMs()) {
          this.turnOff();
          logger.log(logLevel, 'VENT OFF cycle start');
        } else {
          logger.log(logLevel, 'Vent ON - during cycle ON period');
        }
      }
    }
  }

  lightVentControl() {
    // if light off - do a minimal vent routine
    const currentMs = Date.now();

    if (this.ventDarkStatus == 'inactive') {
      logger.log(logLevel, 'VENT: lets start the vent dark ON period');
      // lets start the vent dark ON period
      this.ventDarkStatus = true;
      // this.speedPercent = 50;
      this.turnOn(50);
      // set time it was switched ON
      this.ventDarkOnStartMs = currentMs;
      return;
    }
    // if at end of ON period
    if (this.ventDarkStatus == true && currentMs > this.ventDarkOnStartMs + this.ventOnNightMs) {
      logger.log(logLevel, 'VENT now at end of ON cylce');
      // now at end of ON cylce, enable off period
      this.ventDarkStatus = false;
      // this.speedPercent = 0;
      this.turnOff();
      // set time it was switched ON
      this.ventDarkOffStartMs = currentMs;
      return;
    }
    // if at end of OFF period
    if (this.ventDarkStatus == false && currentMs > this.ventDarkOffStartMs + this.ventOffNightMs) {
      // logger.warn('VENT now at end of OFF cycle');
      // now at end of OFF cycle, so - enable ON period
      this.ventDarkStatus = true;
      // this.speedPercent = 50;
      this.turnOn(50);

      // set time it was switched ON
      this.ventDarkOnStartMs = currentMs;
      return;
    }
    return;
  }

  /**
   * Retrieves telemetry data for the vent.
   *
   * @returns {object} The telemetry data for the vent.
   */
  getTelemetryData() {
    const telemetry = {
      [this.name]: {
        state: this.getState(),
        speedPercent: this.getSpeedPercent(),
        onMs: this.getOnMs(),
        offMs: this.getOffMs(),
        time: Date.now(),
      },
    };
    logger.log(logLevel, `tele vent: ${JSON.stringify(telemetry)}`);
    return telemetry;
  }

  /**
   * Turns on the vent at a specified power level.
   *
   * @param {number} powerLevel - The desired power level for the vent (0, 50, or 100). Defaults to 50.
   */
  turnOn(powerLevel = 50) {
    this.speedPercent = powerLevel;
    if (powerLevel <= 0) {
      this.turnOff();
      return;
    }
    // const ventValue = 1 + (this.speedPercent == 100 ? 1 : 0);
    const ventValue = 1 + (powerLevel == 100 ? 1 : 0);
    this.setState(ventValue);

    if (this.hasNewStateAvailable()) {
      if (Gpio.accessible) {
        // console.log("Turning on vent");
        this.ventPowerPin.writeIO(1);
        this.ventPowerPin.setState(1);

        if (this.speedPercent == 100) {
          this.ventSpeedPin.writeIO(1);
          this.ventSpeedPin.setState(1);
        } else if (this.speedPercent == 50) {
          this.ventSpeedPin.writeIO(0);
          this.ventSpeedPin.setState(0);
        } else {
          logger.log('error', '==Vent speed invalid==');
        }
      } else {
        logger.log('error', '==Vent IO undefined==');
      }
      if (this.emitIfStateChanged()) {
        logger.log(logLevel, '==Vent on==');
      }
    }
  }

  turnOff() {
    // do not write to pin port if the state is the same as previous

    this.speedPercent = 0;
    const ventValue = 0;
    this.setState(ventValue);

    if (this.hasNewStateAvailable()) {
      if (Gpio.accessible) {
        this.ventPowerPin.writeIO(0);
        this.ventPowerPin.setState(0);

        this.ventSpeedPin.writeIO(0);
        this.ventSpeedPin.setState(0);
      } else {
        logger.log('error', '==Vent IO undefined==');
      }
      if (this.emitIfStateChanged()) {
        logger.log(logLevel, '==Vent off==');
      }
    }
  }

  setSpeedPercent(percent) {
    this.speedPercent = percent;
  }

  getSpeedPercent() {
    return this.speedPercent;
  }

  /**
   * Emits state change events for the vent if its state has changed.
   * This includes the vent's power state, speed state, speed percentage, and a combined vent value.
   * @returns {boolean} True if a new state was available and events were emitted, false otherwise.
   */
  emitIfStateChanged() {
    if (this.hasNewStateAvailable()) {
      if (this.getStateAndClearNewStateFlag() > 0) {
        logger.log(logLevel, 'Vent is on');
      } else {
        logger.log(logLevel, 'Vent is off');
      }

      const ventState = this.ventPowerPin.getState();
      const speedState = this.ventSpeedPin.getState();
      logger.log(logLevel, `ventStateChange: ${ventState}, speedState: ${speedState}`);

      let evt = { name: 'state', state: ventState, description: 'vent State change: ' };
      this.trigger('ventStateChange', evt);

      evt = { name: 'speedState', state: speedState, description: 'vent SpeedState change: ' };
      this.trigger('ventStateChange', evt);

      evt = { name: 'speedPercent', state: this.speedPercent, description: 'vent SpeedPercent change: ' };
      this.trigger('ventStateChange', evt);

      const ventValue =
        ventState == 1 && speedState == 0 ? 1
        : ventState == 1 && speedState == 1 ? 2
        : 0;
      evt = { name: 'value', state: ventValue, description: 'vent value change: ' };
      this.trigger('ventStateChange', evt);

      //indicate data read and used e.g MQTT pub
      return true;
    }
    //indicate data NOT NEW and not published e.g MQTT pub
    return false;
  }
}

// https://javascript.info/mixins

// Add the mixin with event-related methods
import eventMixin from './mixins/eventMixin.js';
Object.assign(Vent.prototype, eventMixin);

// add IOPinAccessorsMixin
import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Vent.prototype, IOPinAccessorsMixin);
