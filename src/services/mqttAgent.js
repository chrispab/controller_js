
import logger from "./logger.js";

import cfg from "config";

//Assign the event handler to an event:
// eventEmitter.on('scream', ventEvent);
// import mqtt from 'mqtt';
// import { log } from "console";
// const client = mqtt.connect(config.mqtt.brokerUrl);

import mqtt from 'mqtt';
// const client = mqtt.connect(config.mqtt.brokerUrl);



class MqttAgent {
    constructor() {
        const options = {
            will: {
                topic: cfg.get("mqtt.outTopic") + "/LWT",
                retain: true,
                qos: 2,
                payload: "Offline"
            }
        }
        this.client = mqtt.connect(cfg.get("mqtt.brokerUrl"), options);
        // this.brokerUrl = brokerUrl;
        this.processCount = 0;
        // this.mqttClient = mqtt.connect(this.brokerUrl);
        this.telemetryInterval = cfg.get("telemetry.interval");
        this.lastTelemetryMs = Date.now();
        this.logLevel = 'info';
    }


    telemetry() {
        if (this.lastTelemetryMs + this.telemetryInterval < Date.now()) {
            this.lastTelemetryMs = Date.now();
            this.client.publish(cfg.get("mqtt.outTopic") + "/telemetry", `${this.processCount}`);
            logger.log(this.logLevel, `MQTT-PUB NEW telemetry: ${this.processCount}`);

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

// export default MqttAgent;
//export an instance so single instance can be used
export const mqttAgent = new MqttAgent();
export default mqttAgent;

// MQTTClient.will_set(zoneName+"/LWT", "Offline", 0, False)
const options = {
    will: {
        topic: cfg.get("mqtt.outTopic") + "/LWT",
        retain: true,
        qos: 2,
        payload: "Offline"
    }
}

// mqttAgent.client.connect(cfg.get("mqtt.brokerUrl"), options);

mqttAgent.client.on("connect", function () {
    logger.warn("client connected:" + JSON.stringify(options) );
    // client.subscribe("/a", { qos: 0 });
    // client.publish("a/", "wss secure connection demo...!", { qos: 0, retain: false });
    // client.end();
    mqttAgent.client.subscribe(['Zone1/#', 'Zone2/#', 'Zone3/#']);
    mqttAgent.client.publish(cfg.get("mqtt.outTopic") + "/LWT", "Online", { qos: 0, retain: true });

  });
// # publish(topic, payload=None, qos=0, retain=False)
// MQTTClient.publish(zoneName + "/LWT", "Online", 0, True)

mqttAgent.client.on('message', (topic, message) => {
    // console.log(`Received message on topic ${topic}: ${message}`);
});

