import IOBase from "./IOBase.js";
import logger from "../services/logger.js";
import { Gpio } from 'onoff';

const logLevel = 'debug';

import cfg from "../services/config.js";


// var ventStateEventHandler = function (state, speedState, mqttAgent) {
  
//   logger.log('error', `HI FROM old HANDLER ventStateEventHandler`);
//   //vent state
//   logger.log('info', 'MQTT->Vent: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventStateTopic") + ": " + (state ? 1 : 0)}`);
//   mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventStateTopic"), `${state ? 1 : 0}`);
//   //vent speed state
//   logger.log('info', 'MQTT->Vent speed state: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventSpeedStateTopic") + ": " + (speedState ? 1 : 0)}`);
//   mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventSpeedStateTopic"), `${speedState ? 1 : 0}`);
//   //vent speed percent
//   logger.log('info', 'MQTT->Vent speed percent: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventSpeedPercentTopic") + ": " + (speedState ? 100 : 50)}`);
//   mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventSpeedPercentTopic"), `${(speedState ? 100 : 50)}`);
//   //vent value, 0 is off, 1 is 50%, 2 is 100%
//   const ventValue = (state == 1 && speedState == 0) ? 1 : (state == 1 && speedState == 1) ? 2 : 0
//   logger.log('info', 'MQTT->Vent value: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventValueTopic") + ": " + ventValue}`);
//   mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventValueTopic"), `${ventValue}`);
// }

var ventOnMsChangeEventHandler = function (state, mqttAgent) {
  logger.log('warn', 'MQTT->ventOnMsChangeEvent: ' + `${state}`);
  mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOnDeltaSecsTopic"), `${state / 1000}`);
}

var ventOffMsChangeEventHandler = function (state, mqttAgent) {
  logger.log('warn', 'MQTT->ventOffMsChangeEvent: ' + `${state}`);
  mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOffDeltaSecsTopic"), `${state / 1000}`);
}



export default class Vent extends IOBase {
  constructor(mqttAgent) {
    // const direction = ;
    // const initialValue = 0;
    super(cfg.get("hardware.vent.pin"), 'disabled', 0);
    this.setState(false); // this.state = false;
    this.setName('vent');

    // two Pins, on/off and speed 50-100%
    this.ventPowerPin = new IOBase(cfg.get("hardware.vent.pin"), 'out', 0);
    this.ventPowerPin.setState(false);
    this.ventSpeedPin = new IOBase(cfg.get("hardware.vent.speedPin"), 'out', 0);
    this.ventSpeedPin.setState(false);


    this.setOnMs(cfg.get("vent.onMs"));
    this.setOffMs(cfg.get("vent.offMs"));

    this.setPrevStateChangeMs(Date.now() - this.getOffMs());
    // this.emitterManager = emitterManager;
    this.mqttAgent = mqttAgent;

    this.ventDarkOnDelta = 10000;  // vent on time
    this.ventDarkOffDelta = 60000;
    this.ventDarkOnStartMs = 0;
    this.ventDarkOffStartMs = 0;

    // this.emitterManager.on('ventStateChange', ventStateEventHandler);
    // add a handler, to be called on selection:
    this.on("ventStateChange", this.ventStateEventHandler);


    // from config
    this.speedPercent = cfg.get("vent.speedPercent");
    this.lightOnSetpointOffset = 0.1;
    this.ventOverride = false;
    this.ventDarkStatus = 'inactive';
    //set new reading available
    this.setNewStateAvailable(true);
    this.processCount = 0;
    this.ventIO = this.IO;
    this.ventPulseOnDelta = 10000;

    this.periodicPublishIntervalMs = cfg.get("vent.periodicPublishIntervalMs");
    this.lastPeriodicPublishedMs = Date.now() - this.periodicPublishIntervalMs;

    this.publishStateIntervalMs = cfg.get("vent.publishStateIntervalMs");
    this.lastStatePublishedMs = Date.now() - this.publishStateIntervalMs;
  }

  ventStateEventHandler = function (state, speedState, mqttAgent) {
    //vent state
    logger.log('error', `HI FROM NEW HANDLER ventStateEventHandler`);

    logger.log('info', 'zzMQTT->Vent: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventStateTopic") + ": " + (state ? 1 : 0)}`);
    mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventStateTopic"), `${state ? 1 : 0}`);
    //vent speed state
    logger.log('info', 'zzMQTT->Vent speed state: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventSpeedStateTopic") + ": " + (speedState ? 1 : 0)}`);
    mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventSpeedStateTopic"), `${speedState ? 1 : 0}`);
    //vent speed percent
    logger.log('info', 'zzMQTT->Vent speed percent: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventSpeedPercentTopic") + ": " + (speedState ? 100 : 50)}`);
    mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventSpeedPercentTopic"), `${(speedState ? 100 : 50)}`);
    //vent value, 0 is off, 1 is 50%, 2 is 100%
    const ventValue = (state == 1 && speedState == 0) ? 1 : (state == 1 && speedState == 1) ? 2 : 0
    logger.log('info', 'zzMQTT->Vent value: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventValueTopic") + ": " + ventValue}`);
    mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventValueTopic"), `${ventValue}`);
  }


  process() {
    this.processPeriodicPublication();
  }

  processPeriodicPublication() {
    // ensure regular publishing of additional propperties
    // such as ventOnMs and ventOffMs
    if (Date.now() >= (this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs)) {
      this.lastPeriodicPublishedMs = Date.now();
      // Zonen/vent_on_delta_secs
      logger.log('info', 'MQTT->periodic ventOnDeltaSecs: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOnDeltaSecsTopic") + ": " + (this.getOnMs() / 1000)}`);
      this.mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOnDeltaSecsTopic"), `${this.getOnMs() / 1000}`);

      // ZoneX/vent_off_delta_secs
      logger.log('info', 'MQTT->periodic ventOffDeltaSecs: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOffDeltaSecsTopic") + ": " + (this.getOffMs() / 1000)}`);
      this.mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOffDeltaSecsTopic"), `${this.getOffMs() / 1000}`);
    }
  }


  control(currentTemp, currentHumi, setPointTemperature, lightState) {

    // logger.warn(`temp: ${(Math.round(currentTemp * 100) / 100).toFixed(1)}, target: ${setPointTemperature}, light: ${lightState}`);
    // loff vent/cooling
    const currentMs = Date.now();

    const elapsedMsSinceLastStateChange = currentMs - this.getPrevStateChangeMs();


    // if light off - do a minimal vent routine
    if (lightState == false) {

      this.speedPercent = 50;
      if (this.ventDarkStatus == 'inactive') {
        logger.log(logLevel, 'VENT: lets start the vent dark ON period');
        // lets start the vent dark ON period
        this.ventDarkStatus = true;
        this.turnOn();
        // set time it was switched ON
        this.ventDarkOnStartMs = currentMs;
        return;
      }

      // if at end of ON period
      if ((this.ventDarkStatus == true) && (currentMs > (this.ventDarkOnStartMs + this.ventDarkOnDelta))) {
        logger.log(logLevel, 'VENT now at end of ON cylce');
        // now at end of ON cylce
        // enable off period
        this.ventDarkStatus = false;
        this.turnOff();
        // set time it was switched ON
        this.ventDarkOffStartMs = currentMs;
        return;
      }

      // if at end of OFF period
      if ((this.ventDarkStatus == false) && (currentMs > (this.ventDarkOffStartMs + this.ventDarkOffDelta))) {
        // logger.warn('VENT now at end of OFF cylce');
        // now at end of OFF cylce
        // so - enable ON period
        this.ventDarkStatus = true;
        this.turnOn();
        // set time it was switched ON
        this.ventDarkOnStartMs = currentMs;
        return;
      }
      return;
    } else {
      // mark light off period as inactive
      // logger.info('mark light off period as inactive');
      this.ventDarkStatus = 'inactive';
    }


    // force hispeed if over temp and lon
    //!add some hysteresys here
    // only for upperlon control
    if (lightState == true) {
      const lowerHys = setPointTemperature - 0.1;
      const upperHys = setPointTemperature + 0.2;
      // maybe use a dead band?

      if (this.speedPercent == "100") {
        if (currentTemp > lowerHys) {
          this.speedPercent == "100"  // high speed - leave on
        } else {  // (currentTemp < lowerHys):
          this.speedPercent == "50"  // lo speed
        }
      } else {  // speedstate is OFFt
        if (currentTemp < upperHys) {
          this.speedPercent == "50"  // high speed - leave on
        } else {  // (currentTemp > upperHys):
          this.speedPercent == "100"  // lo speed
        }
      }

      // logger.warn(`temp: ${(Math.round(currentTemp * 100) / 100).toFixed(1)}, target: ${setPointTemperature}, light: ${lightState}, millis: ${currentMs}`);
      // temp above target, change state to ON, full speed
      if ((currentTemp > (setPointTemperature + this.lightOnSetpointOffset))) {
        this.ventOverride = true;
        this.speedPercent = 100;
        this.turnOn();
        logger.log(logLevel, "VENT ON - HI TEMP OVERRIDE - (Re)Triggering cooling pulse")
      }
      // temp below target, change state to OFF after pulse delay
      else if ((this.ventOverride == true) && ((currentMs - this.prevStateChangeMs) >= this.ventPulseOnDelta)) {
        this.speedPercent = 50;
        this.turnOff();
        this.ventOverride = false;
        logger.log(logLevel, "VENT OFF - temp ok, OVERRIDE - OFF")
      } else if (this.ventOverride == true) {
        logger.log(logLevel, 'VENT ON - override in progress')
      }

      // periodic vent control - only execute if vent override not active
      if (this.ventOverride == false) {  // process periodic vent activity
        // logger.warn("---6");

        if (this.getState() == false) {
          // if the vent is off, we must wait for the interval to expire before turning it on
          // if time is up, so change the state to ON
          if (elapsedMsSinceLastStateChange >= this.getOffMs()) {
            this.turnOn();
            logger.log(logLevel, "VENT ON cycle start")
          } else {
            logger.log(logLevel, 'Vent OFF - during cycle OFF period')
          }
        } else {
          // vent is on, we must wait for the 'on' duration to expire before
          // turning it off
          // time up, change state to OFF
          if ((elapsedMsSinceLastStateChange) >= this.getOnMs()) {
            this.turnOff();
            logger.log(logLevel, "VENT OFF cycle start")
          } else {
            logger.log(logLevel, 'Vent ON - during cycle ON period')
          }
        }
      }
    }
  }


  getTelemetryData() {

    let superTelemetry = this.getBaseTelemetryData();

    logger.log('debug', `tele vent: ${JSON.stringify(superTelemetry)}`); // logger.error(JSON.stringify(superTelemetry));

    return superTelemetry;
  }

  getPropertyValue(propertyName) {
    if (typeof this[propertyName] == "undefined")
      return this.emptyValue;
    else
      return this[propertyName];
  }

  setPropertyValue(propertyName, value) {
    this[propertyName] = value;
  }

  turnOn() {
    this.setState(true);

    if (Gpio.accessible) {
      // console.log("Turning on vent");
      this.ventPowerPin.writeIO(1);
      if (this.speedPercent == 100) {
        this.ventSpeedPin.writeIO(1);
      } else if (this.speedPercent == 50) {
        this.ventSpeedPin.writeIO(0);
      } else {
        logger.log('error', '==Vent speed invalid==')
      }
    } else {
      logger.log('error', '==Vent IO undefined==')
    }
    if (this.emitIfStateChanged()) {
      logger.log('debug', '==Vent on==')
    }

  }

  turnOff() {
    this.setState(false);

    if (Gpio.accessible) {
      // this.writeIO(0);
      this.ventPowerPin.writeIO(0);
      if (this.speedPercent == 100) {
        //  this.writeIO(1)
        this.ventSpeedPin.writeIO(1);
      } else if (this.speedPercent == 50) {
        // this.writeIO(0)
        this.ventSpeedPin.writeIO(0);
      } else {
        logger.log('error', '==Vent speed invalid==')
      }
    } else {
      logger.log('error', '==Vent IO undefined==')
    }
    if (this.emitIfStateChanged()) {
      logger.log('debug', '==Vent off==')
    }
  }

  setSpeedPercent(percent) {
    this.speedPercent = percent;
  }
  getSpeedPercent(percent) {
    return this.speedPercent;
  }

  manageVent() {

  }



  emitIfStateChanged() {
    if (this.hasNewStateAvailable()) {
      if (this.getStateAndClearNewStateFlag() == true) {
        logger.log(logLevel, "Vent is on");
      } else {
        logger.log(logLevel, "Vent is off");
      }

      const speedState = this.speedPercent == 100 ? true : false;
      // this.emitterManager.emit('ventStateChange', this.getState(), speedState, this.mqttAgent);
      this.trigger("ventStateChange", this.getState(), speedState, this.mqttAgent);
      //indicate data read and used e.g MQTT pub
      return true
    }
    //indicate data NOT NEW and not published e.g MQTT pub
    return false
  }
} 
// https://javascript.info/mixins
import eventMixin from './mixins/eventMixin.js'
// Add the mixin with event-related methods
Object.assign(Vent.prototype, eventMixin);
