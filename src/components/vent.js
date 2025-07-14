import IOBase from './IOBase.js';
import logger from '../services/logger.js';
import { Gpio } from 'onoff';
import cfg from '../services/config.js';
import * as utils from '../utils/utils.js';

const logLevel = 'debug';

export default class Vent {
  constructor(name, ventPowerPin, ventSpeedPin, mqttAgent) {
    this.mqttAgent = mqttAgent;
    this.IOPin = new IOBase(ventPowerPin, 'dummy vent', 0);
    this.setState(false);
    this.setName(name);
    this.ventPowerPin = new IOBase(ventPowerPin, 'out', 0);
    this.ventPowerPin.setState(false);
    this.ventSpeedPin = new IOBase(ventSpeedPin, 'out', 0);
    this.ventSpeedPin.setState(false);

    this.setOnMs(cfg.get('vent.onMs'));
    this.setOffMs(cfg.get('vent.offMs'));
    this.setPrevStateChangeMs(Date.now() - this.getOffMs());
    this.ventOnDarkMs = cfg.get('vent.ventOnDarkMs');
    this.ventOffDarkMs = cfg.get('vent.ventOffDarkMs');
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

    this.on('ventStateChange', this.ventStateEventHandler);
  }

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
      utils.logAndPublishState(this.mqttAgent, evt.description, topic, evt.state);
    } else {
      logger.warn(`ventStateEventHandler: unknown evt.name: ${evt.name}`);
    }
    logger.log(logLevel,"topic: " + topic + " evt.state: "+ evt.state);
  };


  process() {
    this.periodicPublication();
  }

  periodicPublication() {
    if (Date.now() >= this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs) {
      this.lastPeriodicPublishedMs = Date.now();

      utils.logAndPublishState(this.mqttAgent, 'vent P', cfg.getWithMQTTPrefix('mqtt.ventOnDeltaSecsTopic'), `${this.getOnMs() / 1000}`);
      utils.logAndPublishState(this.mqttAgent, 'vent P', cfg.getWithMQTTPrefix('mqtt.ventOffDeltaSecsTopic'), `${this.getOffMs() / 1000}`);
      utils.logAndPublishState(this.mqttAgent, 'vent P', cfg.getWithMQTTPrefix('mqtt.ventOnDarkSecsTopic'), `${this.ventOnDarkMs / 1000}`);
      utils.logAndPublishState(this.mqttAgent, 'vent P', cfg.getWithMQTTPrefix('mqtt.ventOffDarkSecsTopic'), `${this.ventOffDarkMs / 1000}`);
    }
  }

  control(currentTemp, setPointTemperature, lightState) {
    if (lightState == true){
      this.lightVentControl(currentTemp, setPointTemperature);
    } else {
      this.darkVentControl(currentTemp, setPointTemperature);
    }
  }

  lightVentControl(currentTemp, setPointTemperature) {
    const currentMs = Date.now();
    const elapsedMsSinceLastStateChange = currentMs - this.getPrevStateChangeMs();

    if (currentTemp > setPointTemperature + this.lightOnSetpointOffset) {
      this.ventOverride = true;
      this.turnOn(100);
      logger.log(logLevel, 'VENT ON - HI TEMP OVERRIDE - (Re)Triggering vent cooling pulse');
    } else if (this.ventOverride == true && elapsedMsSinceLastStateChange >= this.ventOverridePulseOnDelta) {
      this.speedPercent = 0;
      this.turnOff();
      this.ventOverride = false;
      logger.log(logLevel, 'VENT OFF - temperature ok, OVERRIDE - OFF');
    } else if (this.ventOverride == true) {
      logger.log(logLevel, 'VENT ON - override in progress');
    }
    if (this.ventOverride == false) {
      if (this.getState() == false) {
        if (elapsedMsSinceLastStateChange >= this.getOffMs()) {
          this.turnOn(50);
          logger.log(logLevel, 'VENT ON cycle start');
        } else {
          logger.log(logLevel, 'Vent OFF - during cycle OFF period');
        }
      } else {
        if (elapsedMsSinceLastStateChange >= this.getOnMs()) {
          this.turnOff();
          logger.log(logLevel, 'VENT OFF cycle start');
        } else {
          logger.log(logLevel, 'Vent ON - during cycle ON period');
        }
      }
    }
  }

  darkVentControl(currentTemp, setPointTemperature) {
    const currentMs = Date.now();

    if (this.ventDarkStatus == 'inactive') {
      logger.log(logLevel, 'VENT: lets start the vent dark ON period');
      this.ventDarkStatus = true;
      this.turnOn(50);
      this.ventDarkOnStartMs = currentMs;
      return;
    }
    if (this.ventDarkStatus == true && currentMs > this.ventDarkOnStartMs + this.ventOnNightMs) {
      logger.log(logLevel, 'VENT now at end of ON cylce');
      this.ventDarkStatus = false;
      this.turnOff();
      this.ventDarkOffStartMs = currentMs;
      return;
    }
    if (this.ventDarkStatus == false && currentMs > this.ventDarkOffStartMs + this.ventOffNightMs) {
      this.ventDarkStatus = true;
      this.turnOn(50);

      this.ventDarkOnStartMs = currentMs;
      return;
    }
    return;
  }

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

  turnOn(powerLevel = 50) {
    this.speedPercent = powerLevel;
    if (powerLevel <= 0) {
      this.turnOff();
      return;
    }
    const ventValue = 1 + (powerLevel == 100 ? 1 : 0);
    this.setState(ventValue);

    if (this.hasNewStateAvailable()) {
      if (Gpio.accessible) {
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

      return true;
    }
    return false;
  }
}

import eventMixin from './mixins/eventMixin.js';
Object.assign(Vent.prototype, eventMixin);

import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Vent.prototype, IOPinAccessorsMixin);