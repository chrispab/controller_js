import IOBase from "./IOBase.js";
import Logger from "../services/Logger.js";
import { Gpio } from 'onoff';

// const logLevel = 'info';
const logLevel = 'debug';

import config from '../config/config.json' assert { type: 'json' }; // NodeJS version.


var ventStateEventHandler = function (state, mqttAgent) {
  Logger.log('warn', 'PUBLISH Vent: ' + `${state}`);
  mqttAgent.client.publish(config.mqtt.outTopic + "/vent_state", `${state ? 1 : 0}`);
}
// this.emitterManager.on('ventState', ventStateEventHandler);

export default class Vent extends IOBase {
  constructor(ventOpPin, onMs, offMs, emitterManager, mqttAgent) {
    super();
    this.offMillis = offMs;
    this.onMillis = onMs;
    this.prevStateChangeMillis = Date.now() - this.offMillis;
    this.emitterManager = emitterManager;
    this.ventOpPin = ventOpPin;
    this.ventIO = Gpio.accessible ? new Gpio(this.ventOpPin, 'out') : { writeSync: value => { console.log('virtual led now uses value: ' + value); } };
    this.mqttAgent = mqttAgent;
    if (this.ventOpPin) {
      this.ventIO.direction("out");
    }
    this.emitterManager.on('ventStateChange', ventStateEventHandler);
    // from config
    // this.onDelta = config.vent.onDelta;
    // this.offDelta = config.vent.offDelta;
    this.speedPercent = config.vent.speedPercent;
    this.vent_lon_sp_offset
    this.vent_override = false;
    this.ventState = 1;
    this.prev_vent_millis
  }


  turnOn() {
    this.setState(true);

    if (this.ventOpPin) {
      // console.log("Turning on vent");
      this.ventIO.writeSync(1);
    }
    // console.log("Turning on vent");
    Logger.log(logLevel, '==Vent on==')
  }

  turnOff() {
    this.setState(false);

    if (this.ventOpPin) {
      this.ventIO.writeSync(0);
    }
    // console.log("Turning off vent");
    Logger.log(logLevel, '==Vent off==')
  }

  setSpeedPercent(percent) {
    this.speedPercent = percent;
  }

  process() {

    this.manageVent();

    // this.control(this.getTemperature(), this.getHumidity(), this.getTargetTemp(), this.getLightState(), Date.now());

    // Logger.info(`this.prevStateChangeMillis: ${this.prevStateChangeMillis}`);

    if (this.hasNewStateAvailable()) {
      if (this.getStateAndClearNewStateFlag() == true) {
        Logger.log(logLevel, "Vent is on");
      } else {
        Logger.log(logLevel, "Vent is off");
      }
      this.emitterManager.emit('ventStateChange', this.getState(), this.mqttAgent);
    }
  }

  manageVent() {
    const currentState = this.ventIO.readSync();
    const currentMs = Date.now();

    if (currentState == 1) {
      // is it time to turn off?
      if (currentMs - this.prevStateChangeMillis > this.onMillis) {
        this.turnOff();
      }
    } else {
      // is it time to turn on?
      if (currentMs - this.prevStateChangeMillis > this.offMillis) {
        this.turnOn();
      }
    }
  }

  control(currentTemp, currentHumi, target_temp, lightState, current_millis) {
    // refresh in case changed while running
    // this.vent_on_delta = cfg.getItemValueFromConfig('ventOnDelta');  // vent on time
    // this.vent_off_delta = cfg.getItemValueFromConfig('ventOffDelta');  // vent off time
    // this.ventDarkOnDelta = cfg.getItemValueFromConfig('ventDarkOnDelta');  // vent on time
    // this.ventDarkOffDelta = cfg.getItemValueFromConfig('ventDarkOffDelta');  // vent on time

    Logger.warn(`temp: ${currentTemp}, target: ${target_temp}, light: ${lightState}, millis: ${current_millis}`);
    // loff vent/cooling

    // if light off - do a minimal vent routine
    if (lightState == false) {
      // this.ventState = OFF;
      // this.speed_state = OFF;
      if (this.ventDark_status == 'inactive') {
        Logger.warn('lets start the vent dark ON period');
        // lets start the vent dark ON period
        this.ventDark_status = ON;
        this.ventState = ON;
        this.speed_state = OFF;
        // set time it was switched ON
        this.ventDark_ON_startTime = current_millis;
        return;
      }

      // if at end of ON period
      if ((this.ventDark_status == true) && (current_millis > (this.ventDark_ON_startTime + this.ventDarkOnDelta))) {
        Logger.warn('# now at end of ON cylce');
        // now at end of ON cylce
        // enable off period
        this.ventDark_status = OFF;
        this.ventState = OFF;
        this.speed_state = OFF;
        // set time it was switched ON
        this.ventDark_OFF_startTime = current_millis;
        return;
      }

      // if at end of OFF period
      if ((this.ventDark_status == false) && (current_millis > (this.ventDark_OFF_startTime + this.ventDarkOffDelta))) {
        Logger.warn('now at end of OFF cylce');
        // now at end of OFF cylce
        // so - enable ON period
        this.ventDark_status = true;
        this.ventState = true;
        this.speed_state = false;
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

      if ((lightState == true) && (currentTemp > target_temp + this.vent_lon_sp_offset)) {
        this.vent_override = true;
        // this.ventState = true;
        this.turnOn();

        // this.prevStateChangeMillis = current_millis;  // retrigeer time period
        Logger.info(
          ".--------------.VENT ON - HI TEMP OVERRIDE - (Re)Triggering cooling pulse")
      }
      // temp below target, change state to OFF after pulse delay
      else if ((this.vent_override == true) && ((current_millis - this.prevStateChangeMillis) >= this.vent_pulse_on_delta)) {
        // this.ventState = false;
        this.turnOff();
        this.vent_override = false;
        // this.prev_vent_millis = current_millis;
        Logger.info("..VENT OFF - temp ok, OVERRIDE - OFF")
      } else if (this.vent_override == true) {
        Logger.info('..Vent on - override in progress')
      }

      // periodic vent control - only execute if vent ovveride not active
      if (this.vent_override == false) {  // process periodic vent activity
        if (this.getState() == false) {  // if the vent is off, we must wait for the interval to expire before turning it on
          // iftime is up, so change the state to ON
          if (current_millis - this.prevStateChangeMillis >= this.offMillis) {
            this.turnOn();  // vent = true;
            Logger.warn("1111111111..VENT ON cycle period start")
            // this.prevStateChangeMillis = current_millis;
          } else {
            // Logger.info('Vent OFF - during cycle OFF period')
          }
        } else {
          // vent is on, we must wait for the 'on' duration to expire before
          // turning it off
          // time up, change state to OFF
          if ((current_millis - this.prevStateChangeMillis) >= this.onMillis) {
            this.turnOff();
            Logger.warn("000000000000..VENT OFF cycle period start")
            // this.prevStateChangeMillis = current_millis;
          } else {
            // Logger.info('Vent ON - during cycle ON period')
          }
        }
      }
    }

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


