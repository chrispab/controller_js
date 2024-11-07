import IOBase from "./IOBase.js";
import logger from "../services/logger.js";
import { Gpio } from "onoff";

import cfg from "../services/config.js";
import * as utils from "../utils/utils.js";
// import mqttAgent from "../services/mqttAgent.js";

const logLevel = "debug";
// const logLevel = 'warn';


export default class Vent {
    constructor(name, ventPowerPin, ventSpeedPin) {
        this.IOPin = new IOBase(ventPowerPin, "dummy vent", 0);
        this.setState(false); // this.state = false;
        this.setName(name);
        // two Pins, on/off and speed 50-100%
        this.ventPowerPin = new IOBase(ventPowerPin, "out", 0);
        this.ventPowerPin.setState(false);
        this.ventSpeedPin = new IOBase(ventSpeedPin, "out", 0);
        this.ventSpeedPin.setState(false);

        this.setOnMs(cfg.get("vent.onMs"));
        this.setOffMs(cfg.get("vent.offMs"));
        this.setPrevStateChangeMs(Date.now() - this.getOffMs());
        this.ventDarkOnDelta = 10000; // vent on time
        this.ventDarkOffDelta = 60000;
        this.ventDarkOnStartMs = 0;
        this.ventDarkOffStartMs = 0;
        // from config
        this.speedPercent = cfg.get("vent.speedPercent");
        this.lightOnSetpointOffset = cfg.get("vent.lightOnSetpointOffset");
        this.ventOverride = false;
        this.ventDarkStatus = "inactive";
        //set new reading available
        this.setNewStateAvailable(true);
        // this.ventIO = this.IO;
        this.ventOverridePulseOnDelta = cfg.get("ventOverridePulseOnDelta");
        this.periodicPublishIntervalMs = cfg.get("vent.periodicPublishIntervalMs");
        this.lastPeriodicPublishedMs = Date.now() - this.periodicPublishIntervalMs;
        this.publishStateIntervalMs = cfg.get("vent.publishStateIntervalMs");
        this.lastStatePublishedMs = Date.now() - this.publishStateIntervalMs;
        this.on("ventStateChange", this.ventStateEventHandler);
    }

    ventStateEventHandler = function (powerState, speedState) {
        //vent powerState
        utils.logAndPublishState("vent", cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventStateTopic"), (powerState ? 1 : 0));
        //vent speed powerState
        utils.logAndPublishState("vent", cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventSpeedStateTopic"), (speedState ? 1 : 0));
        //vent speed percent
        utils.logAndPublishState("vent", cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventSpeedPercentTopic"), `${speedState ? 100 : 50}`);
        //vent value, 0 is off, 1 is 50%, 2 is 100%
        const ventValue = powerState == 1 && speedState == 0 ? 1 : powerState == 1 && speedState == 1 ? 2 : 0;
        utils.logAndPublishState("vent", cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventValueTopic"), `${ventValue}`);
    };

    process() {
        this.processPeriodicPublication();
    }

    processPeriodicPublication() {
        // ensure regular publishing of additional properties
        // such as ventOnMs and ventOffMs
        if (Date.now() >= this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs) {
            this.lastPeriodicPublishedMs = Date.now();
            // ZoneN/vent_on_delta_secs
            utils.logAndPublishState("ventPeriodic", cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOnDeltaSecsTopic"), `${this.getOnMs() / 1000}`);
            // ZoneN/vent_off_delta_secs
            utils.logAndPublishState("ventPeriodic", cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOffDeltaSecsTopic"), `${this.getOffMs() / 1000}`);
        }
    }

    control(currentTemp, setPointTemperature, lightState) {
        // logger.warn(`temp: ${(Math.round(currentTemp * 100) / 100).toFixed(1)}, target: ${setPointTemperature}, light: ${lightState}`);

        if (lightState == 1) {
            this.lightVentStateControl(currentTemp, setPointTemperature)
        } else {
            this.darkVentStateControl();
        }
    }

    lightVentStateControl(currentTemp, setPointTemperature) {
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
        // logger.warn(`temp: ${(Math.round(currentTemp * 100) / 100).toFixed(1)}, target: ${setPointTemperature}, light: ${lightState}, millis: ${currentMs}`);
        // temp above target, change state to ON, full speed
        if (currentTemp > (setPointTemperature + this.lightOnSetpointOffset)) {
            this.ventOverride = true;
            this.speedPercent = 100;
            this.turnOn();
            logger.log(logLevel, "VENT ON - HI TEMP OVERRIDE - (Re)Triggering cooling pulse");
        }
        else if ((this.ventOverride == true) && (elapsedMsSinceLastStateChange >= this.ventOverridePulseOnDelta)) {
            // temp below target, change state to OFF after pulse delay
            this.speedPercent = 50;
            this.turnOff();
            this.ventOverride = false;
            logger.log(logLevel, "VENT OFF - temp ok, OVERRIDE - OFF");
        }
        else if (this.ventOverride == true) {
            logger.log(logLevel, "VENT ON - override in progress");
        }
        // periodic vent control - only execute if vent override not active
        if (this.ventOverride == false) {
            // process periodic vent activity
            // logger.warn("---6");
            if (this.getState() == false) {
                // if the vent is off, we must wait for the interval to expire before turning it on
                // if time is up, so change the state to ON
                if (elapsedMsSinceLastStateChange >= this.getOffMs()) {
                    this.turnOn();
                    logger.log(logLevel, "VENT ON cycle start");
                } else {
                    logger.log(logLevel, "Vent OFF - during cycle OFF period");
                }
            } else {
                // vent is on, we must wait for the 'on' duration to expire before
                // turning it off
                // time up, change state to OFF
                if (elapsedMsSinceLastStateChange >= this.getOnMs()) {
                    this.turnOff();
                    logger.log(logLevel, "VENT OFF cycle start");
                } else {
                    logger.log(logLevel, "Vent ON - during cycle ON period");
                }
            }
        }
    }


    darkVentStateControl() {
        // if light off - do a minimal vent routine
        const currentMs = Date.now();

        this.speedPercent = 50;
        if (this.ventDarkStatus == "inactive") {
            logger.log(logLevel, "VENT: lets start the vent dark ON period");
            // lets start the vent dark ON period
            this.ventDarkStatus = true;
            this.turnOn();
            // set time it was switched ON
            this.ventDarkOnStartMs = currentMs;
            return;
        }
        // if at end of ON period
        if (this.ventDarkStatus == true && currentMs > this.ventDarkOnStartMs + this.ventDarkOnDelta) {
            logger.log(logLevel, "VENT now at end of ON cylce");
            // now at end of ON cylce
            // enable off period
            this.ventDarkStatus = false;
            this.turnOff();
            // set time it was switched ON
            this.ventDarkOffStartMs = currentMs;
            return;
        }
        // if at end of OFF period
        if (this.ventDarkStatus == false && currentMs > this.ventDarkOffStartMs + this.ventDarkOffDelta) {
            // logger.warn('VENT now at end of OFF cycle');
            // now at end of OFF cycle
            // so - enable ON period
            this.ventDarkStatus = true;
            this.turnOn();
            // set time it was switched ON
            this.ventDarkOnStartMs = currentMs;
            return;
        }
        return;

    }


    getTelemetryData() {
        let telemetry = this.getTelemetryData();
        logger.log(logLevel, `tele vent: ${JSON.stringify(telemetry)}`); // logger.error(JSON.stringify(superTelemetry));
        return telemetry;
    }

    turnOn() {
        const ventValue = 1 + (this.speedPercent == 100 ? 1 : 0);

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
                    logger.log("error", "==Vent speed invalid==");
                }
            } else {
                logger.log("error", "==Vent IO undefined==");
            }
            if (this.emitIfStateChanged()) {
                logger.log(logLevel, "==Vent on==");
            }
        }
    }

    turnOff() {
        // do not write to pin port if the state is the same as previous
        const ventValue = 0;
        this.setState(ventValue);
        if (this.hasNewStateAvailable()) {
            if (Gpio.accessible) {
                // this.writeIO(0);
                this.ventPowerPin.writeIO(0);
                this.ventPowerPin.setState(0);
                if (this.speedPercent == 100) {
                    //  this.writeIO(1)
                    this.ventSpeedPin.writeIO(1);
                    this.ventSpeedPin.setState(1);
                } else if (this.speedPercent == 50) {
                    // this.writeIO(0)
                    this.ventSpeedPin.writeIO(0);
                    this.ventSpeedPin.setState(0);
                } else {
                    logger.log("error", "==Vent speed invalid==");
                }
            } else {
                logger.log("error", "==Vent IO undefined==");
            }
            if (this.emitIfStateChanged()) {
                logger.log(logLevel, "==Vent off==");
            }
        }
    }

    setSpeedPercent(percent) {
        this.speedPercent = percent;
    }
    getSpeedPercent() {
        return this.speedPercent;
    }

    manageVent() { }

    emitIfStateChanged() {
        if (this.hasNewStateAvailable()) {
            if (this.getStateAndClearNewStateFlag() > 0) {
                logger.log(logLevel, "Vent is on");
            } else {
                logger.log(logLevel, "Vent is off");
            }
            const speedState = this.speedPercent == 100 ? 1 : 0;

            logger.log("warn", `ventStateChange: ${this.ventPowerPin.getState() ? 1 : 0}, speedState: ${speedState}`);
            
            this.trigger("ventStateChange", this.ventPowerPin.getState() ? 1 : 0, speedState);
            //indicate data read and used e.g MQTT pub
            return true;
        }
        //indicate data NOT NEW and not published e.g MQTT pub
        return false;
    }
}


// https://javascript.info/mixins

// Add the mixin with event-related methods
import eventMixin from "./mixins/eventMixin.js";
Object.assign(Vent.prototype, eventMixin);

import IOPinAccessorsMixin from "./mixins/IOPinAccessorsMixin.js";
Object.assign(Vent.prototype, IOPinAccessorsMixin);

