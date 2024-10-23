// import IOBase from "../components/IOBase.js";
// import events from 'events';
import Logger from "./Logger.js";

import config from '../config/config.json' assert { type: 'json' }; // NodeJS version.
//Assign the event handler to an event:
// eventEmitter.on('scream', ventEvent);
// import mqtt from 'mqtt';
// import { log } from "console";
// const client = mqtt.connect(config.mqtt.brokerUrl);


class MqttAgent {
    constructor(mqttClient, brokerUrl) {
        this.client = mqttClient;
        this.brokerUrl = brokerUrl;
        this.processCount = 0;
        // this.mqttClient = mqtt.connect(this.brokerUrl);
        this.telemetryInterval = config.telemetry.interval;
        this.lastTelemetryMs = Date.now();
        this.logLevel = 'info';
    }


    telemetry() {
        if( this.lastTelemetryMs + this.telemetryInterval < Date.now()) {
            this.lastTelemetryMs = Date.now();
            this.client.publish(config.mqtt.outTopic + "/telemetry", `${this.processCount}`);
            Logger.log(this.logLevel, `-->>( "/telemetry",`);

        }
    }

    process() {
        this.processCount = this.processCount ? this.processCount + 1 : 1;
        // console.log(`Fan process count: ${this.processCount}`);
        this.telemetry();
        // if (this.hasNewStateAvailable()) {
        //     if (this.getStateAndClearNewStateFlag() == true) {
        //         console.log("Fan turning on");
        //     } else {
        //         console.log("Fan turning off");
        //     }
        // }
    }
}

export default MqttAgent;
