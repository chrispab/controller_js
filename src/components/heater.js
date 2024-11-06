import IOBase from "./IOBase.js";
import cfg from "../services/config.js";
import logger from "../services/logger.js";
const logLevel = 'debug';
import { Gpio } from 'onoff';

import * as utils from "../utils/utils.js";
import mqttAgent from "../services/mqttAgent.js";

class Heater {
    constructor(name, heaterPin) {
        this.IOPin = new IOBase(heaterPin, 'out', 0);
        this.setName(name);
        this.heater_sp_offset = cfg.get("heater.heater_sp_offset");
        this.heatingCycleState = 'INACTIVE';
        this.on("heaterStateChange", this.heaterStateEventHandler);
        this.ExternalTDiffMs = cfg.get("heater.ExternalTDiffMs");
    }

    heaterStateEventHandler = function (state) {
        utils.logAndPublishState("heaterState", cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.heaterStateTopic'), (state ? 1 : 0));
    }

    process() {
        this.processCount = this.processCount ? this.processCount + 1 : 1;
    }

    control(currentTemp, setPointTemperature, lightState, outsideTemp = 10) {
        // logger.log('warn',`currentTemp:${currentTemp} setPointTemperature:${setPointTemperature} lightState:${lightState}`);
        const currentMs = Date.now();
        // logger.log('warn', '==Heat ctl==');
        // Calculate new heater on time based on temperature gap
        // this.heatOnMs = ((setPointTemperature - currentTemp) * 20 * 1000) + cfg.getItemValueFromConfig('heatOnMs');
        if (lightState == true) {
            // this.turnOff();
            this.toggleHeater(0);
            return;
        }
        // light is off
        this.heatOffMs = cfg.get('heater.heatOffMs');
        // logger.log('warning', '..light off..do heat ctl');
        // logger.log('warning', 'self.heatingCycleState:', this.heatingCycleState);
        if (currentTemp >= (setPointTemperature + this.heater_sp_offset)) {
            if (this.heatingCycleState === 'INACTIVE') {
                // this.turnOff();
                this.toggleHeater(0);
            }
        }
        // Just trigger a defined ON period - force it to complete
        // Then force a defined OFF period - force it to complete
        // Is an on or off pulse active?
        if (currentTemp < (setPointTemperature + this.heater_sp_offset)) {
            if (this.heatingCycleState === 'INACTIVE') {
                //! Look at on period based on external temp
                // Extra heater time based on difference from set point per 0.1 degree difference
                // let internalDiffT = Math.floor(((setPointTemperature - currentTemp) * 10 * this.InternalTDiffMs));
                // logger.log('warning', '--INTERNAL DIFF extra time to add ms:', internalDiffT);

                // Extra heater time based on external temp difference
                // Do if external diff is >2 deg C
                if (outsideTemp === null) {
                    outsideTemp = 10;
                }
                // let externalDiffT = Math.floor((setPointTemperature - 2 - outsideTemp) * this.ExternalTDiffMs);
                // Milliseconds per degree diff
                // let externalDiffT = Math.floor((setPointTemperature - outsideTemp) * this.ExternalTDiffMs);
                let externalDiffT = (setPointTemperature - outsideTemp) * this.ExternalTDiffMs;
                logger.log('warn', `setPointTemperature:${setPointTemperature} outsideTemp:${outsideTemp} externalDiffT:${externalDiffT}`);
                logger.log('error', `--EXTERNAL DIFF t delta on to add ms:${externalDiffT}`);

                // this.heatOnMs = cfg.getItemValueFromConfig('heatOnMs') + internalDiffT + externalDiffT; // + (outsideTemp / 50);
                this.heatOnMs = cfg.get('heater.heatOnMs') + externalDiffT; // + (outsideTemp / 50);
                this.heatOffMs = cfg.get('heater.heatOffMs');
                logger.log('warn', `>>CALCULATED TOTAL delta ON ms:this.heatOnMs:${this.heatOnMs}`);

                // Start a cycle - ON first
                this.heatingCycleState = 'ON';
                // Init ON state timer
                // this.turnOn();
                this.toggleHeater(1);
                logger.log('warn', "..temp low - currently INACTIVE - TURN HEATing cycle state ON");
            }
        }
        this.heatOffMs = cfg.get('heater.heatOffMs');
        if (this.heatingCycleState == 'ON') {
            if ((currentMs - this.getPrevStateChangeMs()) >= this.heatOnMs) {
                this.heatingCycleState = 'OFF';
                // this.turnOff();
                this.toggleHeater(0);
                logger.log('warn', "..currently ON - TURN HEATing cycle state OFF");
            }
        }

        if (this.heatingCycleState == 'OFF') {
            if ((currentMs - this.getPrevStateChangeMs()) >= this.heatOffMs) {
                this.heatingCycleState = 'INACTIVE';
                logger.log('warn', "..currently OFF - MAKE HEATing cycle state INACTIVE");
                // this.turnOff();
                this.toggleHeater(0);
            }
        }
        // }
    }

    getTelemetryData() {
        let telemetry = this.getBaseTelemetryData();
        logger.log('debug', `Tele heater: ${JSON.stringify(telemetry)}`); // logger.error(JSON.stringify(superTelemetry));
        return telemetry;
    }

    // turnOn() {
    //     this.setState(1);
    //     if (this.hasNewStateAvailable()) {
    //         this.writeIO(1);
    //         this.emitIfStateChanged();
    //     }
    // }

    // turnOff() {
    //     this.setState(0);
    //     if (this.hasNewStateAvailable()) {
    //         this.writeIO(0);
    //         this.emitIfStateChanged();
    //     }
    // }

    toggleHeater(state) {
        this.setState(state);
        if (this.hasNewStateAvailable()) {
            if (Gpio.accessible) {
                this.writeIO(state);
            } else {
                logger.error('==' + this.getName() + ' IO undefined==');
            }
            if (this.getStateAndClearNewStateFlag() == state) {
                logger.log(logLevel, state ? "Heater is on" : "Heater is off");
                this.trigger("heaterStateChange", this.getState());
            }
        }
    }
    // emitIfStateChanged() {
    //     if (this.hasNewStateAvailable()) {
    //         if (this.getStateAndClearNewStateFlag() == true) {
    //             logger.log(logLevel, "Heater is on");
    //         } else {
    //             logger.log(logLevel, "Heater is off");
    //         }
    //         this.trigger("heaterStateChange", this.getState(), mqttAgent);
    //     }
    // }

}

// https://javascript.info/mixins
// Add the mixin with event-related methods
import eventMixin from './mixins/eventMixin.js'
Object.assign(Heater.prototype, eventMixin);

import IOPinAccessorsMixin from "./mixins/IOPinAccessorsMixin.js";
Object.assign(Heater.prototype, IOPinAccessorsMixin);

export default Heater;