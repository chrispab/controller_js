import logger from "./logger.js";

import cfg from "./config.js";

import { logAndPublishStateMqtt } from "../utils/utils.js";

import mqtt from "mqtt";
import secret from "../secret.js";
// const client = mqtt.connect(config.mqtt.brokerUrl);
// let transporter = nodemailer.createTransport(transport[, defaults])
// var nodemailer = require('nodemailer');
import nodemailer from 'nodemailer';
// import { mod1Function } from "../utils/utils.js";
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: secret.user,
    pass: secret.password,
  },
});


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
    this.name = "mqttAgent";
    this.client = mqtt.connect(cfg.get("mqtt.brokerUrl"), options);
    this.processCount = 0;
    this.telemetryIntervalMs = cfg.get("telemetry.interval");
    this.lastTelemetryMs = Date.now() - this.telemetryIntervalMs;
    this.logLevel = "info";

    this.highSetpoint = cfg.get("zone.highSetpoint");
    this.lowSetpoint = cfg.get("zone.lowSetpoint");

    this.periodicPublishIntervalMs = cfg.get("zone.periodicPublishIntervalMs");
    this.lastPeriodicPublishedMs = Date.now() - this.periodicPublishIntervalMs;
    this.emailTest();

  }

  getName() {
    return this.name;
  }


  emailTest() {
    transporter.sendMail({
      from: secret.user,
      to: secret.user,
      subject: "Hello ✔",
      text: "is this body text",
      html: "<b>is this body html?</b>",
    });

    console.log("Message sent: %s", "this is my message");
  }
  
  process(components) {
    this.processCount = this.processCount ? this.processCount + 1 : 1;

    this.doTelemetry(components)
    this.processPeriodicPublication()

  }

  doTelemetry(components) {
    if (this.lastTelemetryMs + this.telemetryIntervalMs < Date.now()) {
      this.lastTelemetryMs = Date.now();
      const data = this.getTelemetryData(components);

      this.logAndPublishState(cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.telemetryTopic'), (data), this.client);

      //publish wifi info
      wifi.getCurrentConnections(
        (error, currentConnections) => {
          if (error) {
            console.log(error);
          } else {
            this.logAndPublishState(cfg.get('mqtt.topicPrefix') + '/rssi', `${currentConnections[0].quality}`, this.client);
          }
        }
      );

    }
  }
  processPeriodicPublication() {

    if (Date.now() >= (this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs)) {
      this.lastPeriodicPublishedMs = Date.now();
      // Zonen/vent_on_delta_secs
      this.logAndPublishState(cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.highSetpointTopic'), `${(cfg.get("zone.highSetpoint"))}`, this.client);

      // Zonen/vent_off_delta_secs
      this.logAndPublishState(cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.lowSetpointTopic'), `${(cfg.get("zone.lowSetpoint"))}`, this.client);
    }
  }


  getTelemetryData(components) {
    const componentData = [];

    for (const component of components) {
      var teledata = component.getTelemetryData();

      const obj1 = JSON.parse(JSON.stringify(teledata));

      componentData.push(JSON.stringify(obj1));

    }

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
// // List the current wifi connections
// const myfunc = () =>
//   wifi.getCurrentConnections((error, currentConnections) => {
//     if (error) {
//       console.log(error);
//     } else {
//       // console.log(currentConnections);
//       return currentConnections;
//     }
//   });

// function getwifiinfo() {
//   let mycurrentConnections = [];

//   wifi.getCurrentConnections((error, currentConnections) => {
//     if (error) {
//       console.log(error);
//     } else {
//       console.log("function getwifiinfo()");
//       // console.log(currentConnections);
//       mycurrentConnections = currentConnections;
//       // return currentConnections;
//     }
//   });
//   return mycurrentConnections;
// }

//export an instance so single instance can be used
export const mqttAgent = new MqttAgent();
export default mqttAgent;

const options = {
  will: {
    topic: cfg.get("mqtt.topicPrefix") + "/LWT",
    retain: true,
    qos: 2,
    payload: "Offline",
  },
};


mqttAgent.client.on("connect", function () {
  logger.info("MQTT client connected:" + JSON.stringify(options));
  // client.subscribe("/a", { qos: 0 });
  // client.publish("a/", "wss secure connection demo...!", { qos: 0, retain: false });
  // client.end();
  mqttAgent.client.subscribe(["Zone1/high_setpoint/set",
    "Zone1/low_setpoint/set",
    "Zone1/vent_on_delta_secs/set",
    "Zone1/vent_off_delta_secs/set",
  ]);
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

// function getwifiinfo() {
//   let mycurrentConnections = [];
//   wifi.getCurrentConnections((error, currentConnections) => {
//     if (error) {
//       console.log(error);
//     } else {
//       console.log("function getwifiinfo()");
//       // console.log(currentConnections);
//       mycurrentConnections = currentConnections;
//       // return currentConnections;
//     }
//   });
//   return mycurrentConnections;
// }

mqttAgent.client.on("message", (topic, message) => {
  logger.warn(`MQTT->Received: ${topic}: ${message}`);

  switch (topic) {
    case (cfg.get("mqtt.topicPrefix") + "/high_setpoint/set"):
      if (Number(message.toString()) > 0) {
        // logger.log('info', 'MQTT->highSetpoint: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.highSetpointTopic") + ": " + (message)}`);
        // mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.highSetpointTopic"), `${message}`);
        logAndPublishStateMqtt('highSetpoint: ', cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.highSetpointTopic'), `${message}`, mqttAgent.client);
        //set the high setpoint in the config object
        const obj1 = { zone: { highSetpoint: Number(message.toString()) } };
        cfg.set("zone.highSetpoint", obj1);
      } else {
        logger.log('error', 'MQTT->highSetpoint/set: NULL PAYLOAD RECEIVED');
      }
      break;

    case (cfg.get("mqtt.topicPrefix") + "/low_setpoint/set"):
      if (Number(message.toString()) > 0) {
        // logger.log('info', 'MQTT->lowSetpoint: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.lowSetpointTopic") + ": " + (message)}`);
        // mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.lowSetpointTopic"), `${message}`);
        logAndPublishStateMqtt('lowSetpoint: ', cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.lowSetpointTopic'), `${message}`, mqttAgent.client);
        //set the low setpoint in the config object
        const obj2 = { zone: { lowSetpoint: Number(message.toString()) } };
        cfg.set("zone.lowSetpoint", obj2);
      } else {
        logger.log('error', 'MQTT->lowSetpoint/set: NULL PAYLOAD RECEIVED');
      }
      break;

    case (cfg.get("mqtt.topicPrefix") + "/vent_on_delta_secs/set"):
      if (Number(message.toString()) > 0) {
        // logger.log('warn', 'MQTT->vent_on_delta_secs: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOnDeltaSecsTopic") + ": " + (message)}`);
        // mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOnDeltaSecsTopic"), `${message}`);
        logAndPublishStateMqtt('vent_on_delta_secs: ', cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.ventOnDeltaSecsTopic'), `${message}`, mqttAgent.client);
        //set the low setpoint in the config object
        const obj3 = { vent: { onMs: Number(message.toString()) * 1000 } };
        cfg.set("vent.onMs", obj3);
      } else {
        logger.log('error', 'MQTT->vent_on_delta_secs/set: NULL PAYLOAD RECEIVED');
      }
      break;

    case (cfg.get("mqtt.topicPrefix") + "/vent_off_delta_secs/set"):
      if (Number(message.toString()) > 0) {
        // logger.log('warn', 'MQTT->vent_off_delta_secs: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOffDeltaSecsTopic") + ": " + (message)}`);
        // mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.ventOffDeltaSecsTopic"), `${message}`);
        logAndPublishStateMqtt('vent_off_delta_secs: ', cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.ventOffDeltaSecsTopic'), `${message}`, mqttAgent.client);
        //set the low setpoint in the config object
        const obj4 = { vent: { offMs: Number(message.toString()) * 1000 } };
        cfg.set("vent.offMs", obj4);
      } else {
        logger.log('error', 'MQTT->vent_off_delta_secs/set: NULL PAYLOAD RECEIVED');
      }
      break;


    default:
      logger.error(`Topic- ${topic} - is not recognised.`);
  }

});



import mqttPublishAndLogMixin from "../components/mixins/mqttPublishAndLogMixin.js";
// import secret from "../secret.js";
Object.assign(MqttAgent.prototype, mqttPublishAndLogMixin);
