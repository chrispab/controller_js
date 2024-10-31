import IOBase from "./IOBase.js";
import logger from "../services/logger.js";
import { Gpio } from 'onoff';

const logLevel = 'debug';
// const logLevel = 'info';

// import cfg from "config";
import cfg from "../services/config.js";



var ventStateEventHandler = function (state, mqttAgent) {
  logger.log('info', 'MQTT->Vent: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventStateTopic") + ": " + (state ? 1 : 0)}`);
  mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventStateTopic"), `${state ? 1 : 0}`);
}

var ventOnMsChangeEventHandler = function (state, mqttAgent) {
  logger.log('warn', 'MQTT->ventOnMsChangeEvent: ' + `${state}`);
  mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOnSecsTopic"), `${state / 1000}`);
}
var ventOffMsChangeEventHandler = function (state, mqttAgent) {
  logger.log('warn', 'MQTT->ventOffMsChangeEvent: ' + `${state}`);
  mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOffSecsTopic"), `${state / 1000}`);
}


export default class Vent extends IOBase {
  constructor(ventOpPin, onMs, offMs, emitterManager, mqttAgent) {
    // const direction = ;
    // const initialValue = 0;
    super(ventOpPin, 'out', 0);
    this.setState(false); // this.state = false;
    this.setName('vent');

    this.setOffMs(offMs);
    this.setOnMs(onMs);
    this.setPrevStateChangeMs(Date.now() - this.getOffMs());
    this.emitterManager = emitterManager;
    this.mqttAgent = mqttAgent;

    this.ventDarkOnDelta = 10000;  // vent on time
    this.ventDarkOffDelta = 60000;
    this.ventDarkOnStartMs = 0;
    this.ventDarkOffStartMs = 0;

    this.emitterManager.on('ventStateChange', ventStateEventHandler);
    // from config
    // this.onDelta = config.vent.onDelta;
    // this.offDelta = config.vent.offDelta;
    this.speedPercent = cfg.get("vent.speedPercent");
    this.lightOnSetpointOffset = 0.1;
    this.ventOverride = false;
    this.ventDarkStatus = 'inactive';
    //set new reading available
    this.setNewStateAvailable(true);
    this.processCount = 0;
    this.ventIO = this.IO;
    this.ventPulseOnDelta = 10000;

    this.lastPeriodicPublishedMs = Date.now();
    this.periodicPublishIntervalMs = cfg.get("vent.periodicPublishIntervalMs");

    this.lastStatePublishedMs = Date.now();
    this.publishStateIntervalMs = cfg.get("vent.publishStateIntervalMs");
  }

  control(currentTemp, currentHumi, setPointTemperature, lightState) {

    // logger.warn(`temp: ${(Math.round(currentTemp * 100) / 100).toFixed(1)}, target: ${setPointTemperature}, light: ${lightState}, millis: ${currentMs}`);
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
        logger.warn('VENT now at end of ON cylce');
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
      this.writeIO(1);
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
      this.writeIO(0);
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

  process() {
    this.processPeriodicPublication();
  }

  processPeriodicPublication() {
    // logger.warn("111vent periodic publishing: " + this.getState());

    // ensure regular publishing of additional propperties
    // such as ventOnMs and ventOffMs
    if (Date.now() >= (this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs)) {
      this.lastPeriodicPublishedMs = Date.now();
      // Zonen/vent_on_delta_secs
      logger.log('warn', 'MQTT->ventOnDeltaSecsTopic: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOnDeltaSecsTopic") + ": " + (this.getOnMs() / 1000)}`);
      this.mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOnDeltaSecsTopic"), `${this.getOnMs() / 1000}`);

      // Zonen/vent_off_delta_secs
      logger.log('warn', 'MQTT->ventOffDeltaSecsTopic: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOffDeltaSecsTopic") + ": " + (this.getOffMs() / 1000)}`);
      this.mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOffDeltaSecsTopic"), `${this.getOffMs() / 1000}`);
    }
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
      this.emitterManager.emit('ventStateChange', this.getState(), this.mqttAgent);
      //indicate data read and used e.g MQTT pub
      return true
    }
    //indicate data NOT NEW and not published e.g MQTT pub
    return false
  }
}

