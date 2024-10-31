import logger from "./logger.js";

// import cfg from "config";
import cfg from "./config.js";

// import utils from "../utils/utils.js";
// import {wifi} from "../utils/utils.js";

//Assign the event handler to an event:
// eventEmitter.on('scream', ventEvent);
// import mqtt from 'mqtt';
// import { log } from "console";
// const client = mqtt.connect(config.mqtt.brokerUrl);

import mqtt from "mqtt";
// const client = mqtt.connect(config.mqtt.brokerUrl);

import { mod1Function } from "../utils/utils.js";

class MqttAgent {
  constructor() {
    const options = {
      will: {
        topic: cfg.get("mqtt.topicPrefix") + "/LWT",
        retain: true,
        qos: 2,
        payload: "Offline",
      },
    };
    this.client = mqtt.connect(cfg.get("mqtt.brokerUrl"), options);
    // this.brokerUrl = brokerUrl;
    this.processCount = 0;
    // this.mqttClient = mqtt.connect(this.brokerUrl);
    this.telemetryIntervalMs = cfg.get("telemetry.interval");
    this.lastTelemetryMs = Date.now() - this.telemetryIntervalMs;
    this.logLevel = "info";

    this.highSetpoint = cfg.get("zone.highSetpoint");
    this.lowSetpoint = cfg.get("zone.lowSetpoint");
  }

  publishAndLog(topic, payload) {
    this.client.publish(topic, payload);
    logger.log(this.logLevel, `MQTT->${topic}: ${payload}`);
  }

  process(components) {
    this.processCount = this.processCount ? this.processCount + 1 : 1;
    // logger.info(`components: ${(components)}`); //JSON.stringify(components}`);
    // this.telemetry(components);
    if (this.lastTelemetryMs + this.telemetryIntervalMs < Date.now()) {
      this.lastTelemetryMs = Date.now();
      const data = this.getTelemetryData(components);
      this.client.publish(
        cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.telemetryTopic"),
        `${data}`
      );
      //   logger.log(this.logLevel, `MQTT->Telemetry: ${data}`);
      logger.log('info', 'MQTT->Telemetry: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.telemetryTopic") + ": " + (data)}`);

      //publish wifi info
      const wifiInfo = wifi.getCurrentConnections(
        (error, currentConnections) => {
          if (error) {
            console.log(error);
          } else {
            // console.log(currentConnections);
            // return currentConnections;
            this.client.publish(
              cfg.get("mqtt.topicPrefix") + "/rssi",
              `${currentConnections[0].quality}`
            );
          }
        }
      );
      // logger.error("client connected:" + (mod1Function()));
      // console.log("xx=============:" + wifiInfo);

      // this.client.publish(cfg.get("mqtt.topicPrefix") + "/rssi", `${myfunc()[0].quality}`);
    }
  }


  getTelemetryData(components) {
    const componentData = [];
    // let componentData = [];

    for (const component of components) {
      var teledata = component.getTelemetryData();
      var jsoncomponent = {};
      jsoncomponent = JSON.stringify(teledata);

      const obj1 = JSON.parse(JSON.stringify(teledata));

      componentData.push(JSON.stringify(obj1));

    }

    var $stringData = JSON.stringify(componentData);
    var $arrStringData = componentData.toString();
    // logger.info("2======> " + componentData.toString());

    return (componentData.toString());
  }
}

// const wifi = require('node-wifi');
import wifi from "node-wifi";
// Initialize wifi module
// Absolutely necessary even to set interface to null
wifi.init({
  iface: null, // network interface, choose a random wifi interface if set to null
});
// List the current wifi connections
const myfunc = () =>
  wifi.getCurrentConnections((error, currentConnections) => {
    if (error) {
      console.log(error);
    } else {
      // console.log(currentConnections);
      return currentConnections;
    }
  });

function getwifiinfo() {
  let mycurrentConnections = [];

  wifi.getCurrentConnections((error, currentConnections) => {
    if (error) {
      console.log(error);
    } else {
      console.log("function getwifiinfo()");
      // console.log(currentConnections);
      mycurrentConnections = currentConnections;
      // return currentConnections;
    }
  });
  return mycurrentConnections;
}

// export default MqttAgent;
//export an instance so single instance can be used
export const mqttAgent = new MqttAgent();
export default mqttAgent;

// MQTTClient.will_set(zoneName+"/LWT", "Offline", 0, False)
const options = {
  will: {
    topic: cfg.get("mqtt.topicPrefix") + "/LWT",
    retain: true,
    qos: 2,
    payload: "Offline",
  },
};

// mqttAgent.client.connect(cfg.get("mqtt.brokerUrl"), options);

mqttAgent.client.on("connect", function () {
  logger.info("MQTT client connected:" + JSON.stringify(options));
  // client.subscribe("/a", { qos: 0 });
  // client.publish("a/", "wss secure connection demo...!", { qos: 0, retain: false });
  // client.end();
  mqttAgent.client.subscribe(["Zone1/high_setpoint/set", "Zone1/low_setpoint/set"]);
  //   Zone1/high_setpoint/set
  mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + "/LWT", "Online", {
    qos: 0,
    retain: true,
  });
});

mqttAgent.client.on("packetsend", function () {
  // logger.warn(".........published:" + JSON.stringify(options));
  // client.subscribe("/a", { qos: 0 });
  // client.publish("a/", "wss secure connection demo...!", { qos: 0, retain: false });
  // client.end();
  // mqttAgent.client.subscribe(['Zone1/#', 'Zone2/#', 'Zone3/#']);
  // mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + "/LWT", "Online", { qos: 0, retain: true });
});
// # publish(topic, payload=None, qos=0, retain=False)
// MQTTClient.publish(zoneName + "/LWT", "Online", 0, True)

mqttAgent.client.on("message", (topic, message) => {
  // console.log(`Received message on topic ${topic}: ${message}`);
  logger.warn(`Received message on topic ${topic}: ${message}`);

  //   Zone1/high_setpoint/set
  if (topic == cfg.get("mqtt.topicPrefix") + "/high_setpoint/set") {
    //get the payload
    const payload = message;
    //set the high setpoint in the config object
    // cfg.set("zone.highSetpoint", payload);
    logger.log('info', 'MQTT->highSetpoint: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.highSetpointTopic") + ": " + (payload)}`);
    mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.highSetpointTopic"), `${payload}`);

    mqttAgent.highSetpoint = payload;

  } else if (topic == cfg.get("mqtt.topicPrefix") + "/low_setpoint/set") {
    const payload = message;
    // cfg.set("zone.lowSetpoint", payload);
    logger.log('info', 'MQTT->lowSetpoint: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.lowSetpointTopic") + ": " + (payload)}`);
    mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.lowSetpointTopic"), `${payload}`);
    mqttAgent.lowSetpoint = payload;
  }
});
