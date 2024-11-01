import IOBase from "./IOBase.js";

import { Gpio } from "onoff";

// const logLevel = 'info';
const logLevel = "debug";
// const logLevel = 'warn';

// import config from '../config/config.json' assert { type: 'json' };
// import cfg from "config";
import cfg from "../services/config.js";

import Logger from "../services/logger.js";
import logger from "../services/logger.js";

var lightStateEventHandler = function (state, mqttAgent) {
    logger.log(
        "info",
        "MQTT->Light: " +
        `${cfg.get("mqtt.topicPrefix") +
        cfg.get("mqtt.lightStateTopic") +
        ": " +
        (state ? 1 : 0)
        }`
    );
    mqttAgent.client.publish(
        cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.lightStateTopic"),
        `${state ? 1 : 0}`
    );
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default class Light extends IOBase {
    #currentlySamplingLightSensor;
    #processCount;
    #RCLoopCount;
    constructor(RCPin, emitterManager, mqttAgent) {
        super(RCPin, "out", 0);
        this.setPrevStateChangeMs(Date.now() - this.offMs);
        this.setName("light");

        this.#RCLoopCount = 0;

        this.#currentlySamplingLightSensor = false;

        this.mqttAgent = mqttAgent;
        this.emitterManager = emitterManager;
        this.emitterManager.on("lightStateChange", lightStateEventHandler);
        //set new reading available
        // this.setNewStateAvailable(true);
        this.#processCount = 0;
        this.readLightSensorState();
        this.lastStatePublishedMs = Date.now() - cfg.get("light.publishStateIntervalMs");
        this.sensorReadIntervalMs = cfg.get("light.sensorReadIntervalMs");
        this.publishStateIntervalMs = cfg.get("light.publishStateIntervalMs");
        this.lastSensorReadTimeMs = Date.now() - this.sensorReadIntervalMs;
        // this.publishStateIntervalMs = 1000;
    }

    process() {
        // do an actual read of the sensor every sensorReadIntervalMs
        if (Date.now() >= (this.lastSensorReadTimeMs + this.sensorReadIntervalMs)) {
            logger.log(logLevel, "READING Light SENSOR STATE: " + this.getState());
            this.readLightSensorState();
            this.lastSensorReadTimeMs = Date.now();
            
            //if its a new value publish it
            if (this.hasNewStateAvailable()) {
                this.lastStatePublishedMs = Date.now();
                this.emitterManager.emit('lightStateChange', this.getState, this.mqttAgent);
                this.setNewStateAvailable(false);
            }
        }

        // ensure regular state publishing, at least every publishStateIntervalMs
        if (Date.now() >= (this.lastStatePublishedMs + this.publishStateIntervalMs)) {
            logger.log(logLevel, "READING REGULAR Light STATE: " + this.getState());
            this.lastStatePublishedMs = Date.now();
            this.emitterManager.emit(
                "lightStateChange",
                this.getState(),
                this.mqttAgent
            );
        }

    }

    turnOn() {
        this.setState(true);
    }

    turnOff() {
        this.setState(false);
    }
    getTelemetryData() {
        let superTelemetry = this.getBaseTelemetryData();

        logger.log("debug", `tele light: ${JSON.stringify(superTelemetry)}`); // logger.error(JSON.stringify(superTelemetry));

        return superTelemetry;
    }

    readLightSensorState() {
        logger.log(
            logLevel,
            `>>>readLightSensorState this.#RCLoopCount: ${this.#RCLoopCount}`
        );

        // const lightState = (this.#RCLoopCount > 1000) ? false : true;
        this.setState(this.#RCLoopCount > 1000 ? false : true);
        Logger.log(logLevel, `>>>.#RCLoopCount: ${this.#RCLoopCount}`);

        const lightState = this.getState();
        logger.log(logLevel, `>>>lightState: ${lightState}`);
        // new ldr based routine test
        this.initiateGetRCChargeLoopCount(); // Measure timing using GPIO4
        // this.state = lightState
        return this.setState(lightState);
    }

    /**
     * Measures the time it takes for the voltage across the capacitor to reach
     * a value readable by the GPIO. This is done by:
     * 1. Discharging the capacitor by setting the pin as an output and writing LOW.
     * 2. Waiting for 0.1s to give time for the capacitor to discharge.
     * 3. Setting the pin as an input and reading the voltage.
     * 4. Counting the number of loops until the voltage is read as HIGH.
     *
     * @returns {number} The number of loops until the voltage is read as HIGH.
     */
    initiateGetRCChargeLoopCount() {
        logger.log(logLevel, "==initiateGetRCChargeLoopCount");

        this.#RCLoopCount = 0;
        if (Gpio.accessible) {
            // Discharge capacitor
            // this.rcIO.setDirection('out');
            // this.rcIO.writeSync(0)
            // console.log('--Hello1');
            var self = this;
            logger.log(logLevel, `1.....var self = this:`);

            wait(50)
                .then(() => this.readLDRChargeLoopCount(self))
                .catch(console.error);
        } else {
            this.#RCLoopCount = 111;
            logger.log(
                "error",
                `DEMO-Gpio not accessible returning default #RCLoopCount: ${this.#RCLoopCount
                }`
            );
        }
        return this.#RCLoopCount;
    }

    // wait(ms) {
    //     return new Promise(resolve => setTimeout(resolve, ms));
    // }

    /**
     * Measures the loop count required for the voltage across the capacitor to be read as high by the GPIO.
     * The method ensures the light sensor is not currently being sampled before proceeding to:
     * 1. Set the IO direction to input to charge the capacitor.
     * 2. Increment the loop count until a high voltage is read or a maximum count is reached.
     * 3. Discharge the capacitor by setting the IO direction to output and writing a low value.
     * The loop count is logged for debugging purposes.
     *
     * @param {object} self - The context object containing the state and methods for IO operations.
     */
    readLDRChargeLoopCount(self) {
        logger.log(logLevel, "---2");
        // Count loops until voltage across capacitor reads high on GPIO
        // console.log(`out self.rcIO.readSync(): ${self.rcIO.readSync()}`);
        // if not currently sampling then start counting
        // console.log(`2.....var self = this:${JSON.stringify(self)}`);
        if (self.#currentlySamplingLightSensor == false) {
            self.#currentlySamplingLightSensor = true;
            logger.log(logLevel, "---3");

            // charge capacitor
            self.setIODirection("in");

            while (self.readIO() == 0 && self.#RCLoopCount < 999999) {
                self.#RCLoopCount += 1;
                // console.log(`self.rcIO.readSync(): ${self.#RCLoopCount}`);
            }
            // self.setState(self.#RCLoopCount > 1000 ? false : true);

            // discharge capacitor
            self.setIODirection("out");
            self.writeIO(0);

            Logger.log(logLevel, `>>>>>self.getState(): ${self.getState()}`);

            Logger.log(
                logLevel,
                `>>>>>>>>>>>>>self.#RCLoopCount: ${self.#RCLoopCount}`
            );
            // console.log(`>>>>>this.#RCLoopCount: ${self.#RCLoopCount}`);
            // console.log('World!');
            self.#currentlySamplingLightSensor = false;
        } else {
            Logger.log(
                logLevel,
                `!! currently SamplingLight Sensor: ${self.#currentlySamplingLightSensor
                }`
            );
        }
    }
}
