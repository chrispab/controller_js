import IOBase from "./IOBase.js";
import Logger from "../services/logger.js";
import { Gpio } from 'onoff';

// const logLevel = 'info';
const logLevel = 'debug';

// import config from '../config/config.json' assert { type: 'json' }; // NodeJS version.
import cfg from "config";
import logger from "../services/logger.js";


var ventStateEventHandler = function (state, mqttAgent) {
  Logger.log('warn', 'MQTT-PUB NEW Vent: ' + `${state}`);
  mqttAgent.client.publish(cfg.get("mqtt.outTopicPrefix") + cfg.get("mqtt.ventStateTopic"), `${state ? 1 : 0}`);
}

var ventOnMsChangeEventHandler = function (state, mqttAgent) {
  Logger.log('warn', 'MQTT-PUB NEW ventOnMsChangeEvent: ' + `${state}`);
  mqttAgent.client.publish(cfg.get("mqtt.outTopicPrefix") + cfg.get("mqtt.ventOnSecsTopic"), `${state / 1000}`);
}
var ventOffMsChangeEventHandler = function (state, mqttAgent) {
  Logger.log('warn', 'MQTT-PUB NEW ventOffMsChangeEvent: ' + `${state}`);
  mqttAgent.client.publish(cfg.get("mqtt.outTopicPrefix") + cfg.get("mqtt.ventOffSecsTopic"), `${state / 1000}`);
}
// this.emitterManager.on('ventState', ventStateEventHandler);
// Zone3/VentStatus
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
    this.lastVisitMs = Date.now();
    this.emitterManager = emitterManager;
    this.mqttAgent = mqttAgent;

    this.ventDarkOnDelta = 10000;  // vent on time
    this.ventDarkOffDelta = 60000;
    this.ventDark_ON_startTime = 0;
    this.ventDark_OFF_startTime = 0;

    this.emitterManager.on('ventStateChange', ventStateEventHandler);
    // from config
    // this.onDelta = config.vent.onDelta;
    // this.offDelta = config.vent.offDelta;
    this.speedPercent = cfg.get("vent.speedPercent");
    this.vent_lon_sp_offset = 0.1;
    this.vent_override = false;
    this.ventState = 1;
    this.prev_vent_millis
    this.ventDark_status = 'inactive';
    //set new reading available
    this.setNewStateAvailable(true);
    this.processCount = 0;
    this.ventIO = this.IO;
    this.vent_pulse_on_delta = 10000;
  }

  getTelemetryData() {

    let superTelemetry = super.getTelemetryData();

    logger.error(JSON.stringify(superTelemetry));

    let selfTelemetry = {
      name: this.getPropertyValue('name'),
      state: this.getPropertyValue('state'),
      time: Date.now()
    }

    let data = {
      ...superTelemetry,
      ...selfTelemetry
    } 
    
    logger.error(JSON.stringify(data));
    // logger.error(JSON.stringify(data) + '=> ' + this.data);
    return data;
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
      Logger.log('error', '==Vent IO undefined==')
    }
    this.emitIfStateChanged();
    Logger.log(logLevel, '==Vent on==')
  }

  turnOff() {
    this.setState(false);

    if (Gpio.accessible) {
      this.writeIO(0);
    } else {
      Logger.log('error', '==Vent IO undefined==')
    }
    this.emitIfStateChanged();
    // Logger.log(logLevel, '==Vent off==')
  }

  setSpeedPercent(percent) {
    this.speedPercent = percent;
  }

  process() {

    // this.manageVent();

    // this.control(this.getTemperature(), this.getHumidity(), this.getTargetTemp(), this.getLightState(), Date.now());

    // Logger.info(`this.prevStateChangeMs: ${this.prevStateChangeMs}`);

    // if (this.hasNewStateAvailable()) {
    //   if (this.getStateAndClearNewStateFlag() == true) {
    //     Logger.log(logLevel, "Vent is on");
    // } else {
    //     Logger.log(logLevel, "Vent is off");
    //   }
    // this.emitterManager.emit('ventStateChange', this.getState(), this.mqttAgent);
    // }
  }

  manageVent() {
    // const currentState = this.IO.readSync();
    // const currentMs = Date.now();
    // const elapsedMsSinceLastStateChange = currentMs - this.getPrevStateChangeMs();

    // if (currentState == 1) {
    //   // is it time to turn off?
    //   if (elapsedMsSinceLastStateChange >= this.getOnMs()) {
    //     this.turnOff();
    //   }
    // } else {// 0
    //   // is it time to turn on?
    //   if (elapsedMsSinceLastStateChange >= this.getOffMs()) {
    //     this.turnOn();
    //   }
    // }
  }

  control(currentTemp, currentHumi, target_temp, lightState, current_millis) {

    // Logger.warn(`temp: ${(Math.round(currentTemp * 100) / 100).toFixed(1)}, target: ${target_temp}, light: ${lightState}, millis: ${current_millis}`);
    // loff vent/cooling
    // const elapsedMsSinceLastStateChange = current_millis - this.lastVisitMs;
    const elapsedMsSinceLastStateChange = current_millis - this.getPrevStateChangeMs();
    this.lastVisitMs = Date.now();

    // if light off - do a minimal vent routine
    if (lightState == false) {
      // this.ventState = OFF;
      // this.speed_state = OFF;
      if (this.ventDark_status == 'inactive') {
        Logger.warn('VENT: lets start the vent dark ON period');
        // lets start the vent dark ON period
        this.ventDark_status = true;
        // this.ventState = ON;
        this.turnOff();
        this.speedPercent = 0;
        // set time it was switched ON
        this.ventDark_ON_startTime = current_millis;

        return;
      }

      // if at end of ON period
      if ((this.ventDark_status == true) && (current_millis > (this.ventDark_ON_startTime + this.ventDarkOnDelta))) {
        Logger.warn('VENT now at end of ON cylce');
        // now at end of ON cylce
        // enable off period
        this.ventDark_status = false;
        // this.ventState = false;
        this.turnOff();
        this.speed_state = false;
        // set time it was switched ON
        this.ventDark_OFF_startTime = current_millis;
        return;
      }

      // if at end of OFF period
      if ((this.ventDark_status == false) && (current_millis > (this.ventDark_OFF_startTime + this.ventDarkOffDelta))) {
        // Logger.warn('VENT now at end of OFF cylce');
        // now at end of OFF cylce
        // so - enable ON period
        this.ventDark_status = true;
        // this.ventState = true;
        this.turnOn();
        this.speedPercent = 0;
        // set time it was switched ON
        this.ventDark_ON_startTime = current_millis;
        return;
      }
      return;
    } else {  // mark light off period as inactive
      // Logger.info('mark light off period as inactive');
      this.ventDark_status = 'inactive';
    }


    // force hispeed if over temp and lon
    //!add some hysteresys here
    // only for upperlon control
    if (lightState == true) {
      const lowerHys = target_temp - 0.1;
      const upperHys = target_temp + 0.2;
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
      // Logger.warn("---1");

      // Logger.warn(`temp: ${(Math.round(currentTemp * 100) / 100).toFixed(1)}, target: ${target_temp}, light: ${lightState}, millis: ${current_millis}`);

      if ((currentTemp > (target_temp + this.vent_lon_sp_offset))) {
        this.vent_override = true;
        // this.ventState = true;
        this.turnOn();
        // Logger.warn("---2");

        // Logger.info("VENT ON - HI TEMP OVERRIDE - (Re)Triggering cooling pulse")
      }
      // temp below target, change state to OFF after pulse delay
      else if ((this.vent_override == true) && ((current_millis - this.prevStateChangeMs) >= this.vent_pulse_on_delta)) {
        // this.ventState = false;
        // Logger.warn("---3");

        this.turnOff();
        this.vent_override = false;
        // this.prev_vent_millis = current_millis;
        // Logger.info("VENT OFF - temp ok, OVERRIDE - OFF")
      } else if (this.vent_override == true) {
        // Logger.warn("---4");

        // Logger.info('VENT ON - override in progress')
      }
      // Logger.warn("---5");

      // periodic vent control - only execute if vent ovveride not active
      if (this.vent_override == false) {  // process periodic vent activity
        // Logger.warn("---6");

        if (this.getState() == false) {  // if the vent is off, we must wait for the interval to expire before turning it on
          // iftime is up, so change the state to ON
          if (elapsedMsSinceLastStateChange >= this.getOffMs()) {
            this.turnOn();  // vent = true;
            // Logger.warn("VENT ON cycle start")
            // Logger.warn("---7");

          } else {
            // Logger.info('Vent OFF - during cycle OFF period')
            // Logger.warn("---8");

          }
        } else {
          // vent is on, we must wait for the 'on' duration to expire before
          // turning it off
          // time up, change state to OFF
          if ((elapsedMsSinceLastStateChange) >= this.getOnMs()) {
            // Logger.warn("---9");

            this.turnOff();
            // Logger.warn("VENT OFF cycle start")
          } else {
            // Logger.info('Vent ON - during cycle ON period')
            // Logger.warn("---10");

          }
        }
      }
    }


    // this.lastVisitMs = Date.now();
  }

  emitIfStateChanged() {
    if (this.hasNewStateAvailable()) {
      if (this.getStateAndClearNewStateFlag() == true) {
        Logger.log(logLevel, "Vent is on");
      } else {
        Logger.log(logLevel, "Vent is off");
      }
      this.emitterManager.emit('ventStateChange', this.getState(), this.mqttAgent);
    }
  }
}

