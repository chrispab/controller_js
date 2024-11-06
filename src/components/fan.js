import IOBase from "./IOBase.js";
import { Gpio } from 'onoff';
import mqttAgent from "../services/mqttAgent.js";
import cfg from "../services/config.js";
import logger from "../services/logger.js";
const logLevel = 'debug';
// const logLevel = 'info';
// import utils from "../utils/utils.js";
import * as utils from "../utils/utils.js";


export default class Fan {
    constructor(name, fanPin) {
        this.IOPin = new IOBase(fanPin, 'out', 0);
        this.setName(name);
        this.setState(false);
        this.setOffMs(cfg.get("fan.offMs"));
        this.setOnMs(cfg.get("fan.onMs"));
        this.setPrevStateChangeMs(Date.now() - this.getOffMs());
        this.on("fanStateChange", this.fanStateEventHandler);
        //set new reading available
        this.setNewStateAvailable(true);
        this.processCount = 0;
        this.periodicPublishIntervalMs = cfg.get("fan.periodicPublishIntervalMs");
        this.lastPeriodicPublishedMs = Date.now() - this.periodicPublishIntervalMs;
    }

    fanStateEventHandler = function (state) {
        utils.logAndPublishState("fanState", cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.fanStateTopic'), (state ? 1 : 0));
    }

    process() {
        this.manageFan();
        this.processPeriodicPublication();
    }

    processPeriodicPublication() {
        // ensure regular publishing of additional properties
        // such as fanOnMs and fanOffMs
        if (Date.now() >= (this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs)) {
            this.lastPeriodicPublishedMs = Date.now();
            // Zonen/fan_on_delta_secs
            utils.logAndPublishState("PeriodicPublication", cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.fanOnDeltaSecsTopic'), (this.getOnMs() / 1000));
            // Zonen/fan_off_delta_secs
            utils.logAndPublishState("PeriodicPublication",cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.fanOffDeltaSecsTopic'), (this.getOffMs() / 1000));
        }
    }

    manageFan() {
        const currentState = this.getState();
        const currentMs = Date.now();
        const elapsedMs = currentMs - this.getPrevStateChangeMs();

        if (currentState == true) {
            // is it time to turn off?
            if (elapsedMs >= this.getOnMs()) {
                this.turnOff();
            }
        } else {// 0
            // is it time to turn on?
            if (elapsedMs >= this.getOffMs()) {
                this.turnOn();
            }
        }
    }

    turnOn() {
        this.setState(true);

        if (this.hasNewStateAvailable()) {
            if (Gpio.accessible) {
                this.IOPin.writeIO(1);
            } else {
                logger.error('==' + this.getName() + ' IO undefined==')
            }
            if (this.emitIfStateChanged()) {
                logger.log('debug', '==' + this.getName() + ' IO on==')
            }
        }
    }

    turnOff() {
        this.setState(false);
        if (this.hasNewStateAvailable()) {
            if (Gpio.accessible) {
                this.IOPin.writeIO(0);
            } else {
                logger.error('==' + this.getName() + ' IO undefined==')
            }
            if (this.emitIfStateChanged()) {
                logger.log('debug', '==' + this.getName() + ' IO off==')
            }
        }
    }


    emitIfStateChanged() {
        if (this.hasNewStateAvailable()) {
            if (this.getStateAndClearNewStateFlag() == true) {
                logger.log(logLevel, "Fan is on");
            } else {
                logger.log(logLevel, "Fan is off");
            }
            // this.trigger("fanStateChange", this.getState(), this.mqttAgent);
            this.trigger("fanStateChange", this.getState(), mqttAgent);
            return true
        }
        return false
    }

}


// https://javascript.info/mixins
// Add the mixin with event-related methods
import eventMixin from './mixins/eventMixin.js'
Object.assign(Fan.prototype, eventMixin);

import IOPinAccessorsMixin from "./mixins/IOPinAccessorsMixin.js";
Object.assign(Fan.prototype, IOPinAccessorsMixin);

