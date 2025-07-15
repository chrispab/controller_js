import logger from './logger.js';
import cfg from './config.js';

import wifi from 'node-wifi';
import mqtt from 'mqtt';

const logLevel = 'debug';

import * as utils from '../utils/utils.js';
 
import secret from '../secret.js';
 
import nodemailer from 'nodemailer';
// import { warn } from 'winston';

// const wifi = require('node-wifi');
// Initialize wifi module
// Absolutely necessary even to set interface to null
wifi.init({
  iface: null, // network interface, choose a random wifi interface if set to null
});

class MqttAgent {
  constructor() {
    this.name = 'mqttAgent';
    this.options = {
      will: {
        topic: cfg.getWithMQTTPrefix('mqtt.LWTTopic'),
        retain: true,
        qos: 2,
        payload: 'Offline',
      },
    };
    this.client = mqtt.connect(cfg.get('mqtt.brokerUrl'), this.options);
    this.processCount = 0;
    this.telemetryIntervalMs = cfg.get('telemetry.interval');
    this.lastTelemetryMs = Date.now() - this.telemetryIntervalMs;
    this.logLevel = 'info';
    this.highSetpoint = cfg.get('zone.highSetpoint');
    this.lowSetpoint = cfg.get('zone.lowSetpoint');
    this.periodicPublishIntervalMs = cfg.get('zone.periodicPublishIntervalMs');
    this.lastPeriodicPublishedMs = Date.now() - this.periodicPublishIntervalMs;
    this.outsideTemperature = 7;
    this.activeSetpoint = 0;
    this.version = cfg.get('version');
    this.zoneName = cfg.get('zone.name');

    utils.sendEmail(this.zoneName + ' startup', 'zone startup');
  }

  getName() {
    return this.name;
  }

  setactiveSetpoint(activeSetpoint) {
    this.activeSetpoint = activeSetpoint;
  }

  process(components) {
    this.processCount = this.processCount ? this.processCount + 1 : 1;
    if (cfg.get('zone.telemetry.enabled') == true) {
      this.doTelemetry(components);
    }else{
      logger.log(logLevel, "globally disabled telemetry")
    }
    this.periodicPublication();
  }

  doTelemetry(components) {
    if (this.lastTelemetryMs + this.telemetryIntervalMs < Date.now()) {
      this.lastTelemetryMs = Date.now();
      const data = this.getTelemetryData(components);
      utils.logAndPublishState('mqttdoTelemetry', cfg.getWithMQTTPrefix('mqtt.telemetryTopic'), data);
    }
  }

  periodicPublication() {
    if (Date.now() >= this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs) {
      this.lastPeriodicPublishedMs = Date.now();
      // highSetpoint
      utils.logAndPublishState('mqtt P', cfg.getWithMQTTPrefix('mqtt.highSetpointTopic'), `${cfg.get('zone.highSetpoint')}`);
      // lowSetpoint
      utils.logAndPublishState('mqtt P', cfg.getWithMQTTPrefix('mqtt.lowSetpointTopic'), `${cfg.get('zone.lowSetpoint')}`);
      // activeSetpoint
      utils.logAndPublishState('mqtt P', cfg.getWithMQTTPrefix('mqtt.activeSetpointTopic'), this.activeSetpoint);
      //version
      utils.logAndPublishState('mqtt P', cfg.getWithMQTTPrefix('mqtt.versionTopic'), this.version);

      //publish wifi info
      wifi.getCurrentConnections((error, currentConnections) => {
        if (error) {
          // console.log(error);
          logger.log(logLevel,"getCurrentConnections error: " + error)
        } else {
          utils.logAndPublishState('mqtt P', cfg.getWithMQTTPrefix('mqtt.rssiTopic'), `${currentConnections[0].quality}`);
        }
      });
    }
  }

  getTelemetryData(components) {
    const componentData = [];
    for (const component of components) {
      var teledata = component.getTelemetryData();
      const obj1 = JSON.parse(JSON.stringify(teledata));
      componentData.push(JSON.stringify(obj1));
    }
    return componentData.toString();
  }
}

//export an instance so single instance can be used
export const mqttAgent = new MqttAgent();
export default mqttAgent;

mqttAgent.client.on('connect', function () {
  logger.info('MQTT client connected:' + JSON.stringify(mqttAgent.options));
  // client.subscribe("/a", { qos: 0 });
  // client.publish("a/", "wss secure connection demo...!", { qos: 0, retain: false });
  // client.end();
  mqttAgent.client.subscribe([
    cfg.getWithMQTTPrefix('mqtt.highSetpointSetTopic'),
    cfg.getWithMQTTPrefix('mqtt.lowSetpointSetTopic'),
    cfg.getWithMQTTPrefix('mqtt.ventOnDeltaSecsSetTopic'),
    cfg.getWithMQTTPrefix('mqtt.ventOffDeltaSecsSetTopic'),
    cfg.get('mqtt.outsideSensorTopic'), //has no zone prefix
    cfg.getWithMQTTPrefix('mqtt.ventOnDarkSecsSetTopic'),
    cfg.getWithMQTTPrefix('mqtt.ventOffDarkSecsSetTopic'),
  ]);

  mqttAgent.client.publish(cfg.getWithMQTTPrefix('mqtt.LWTTopic'), 'Online', {
    qos: 0,
    retain: true,
  });
});

mqttAgent.client.on('packetsend', function () {
  // logger.warn(".........published:" + JSON.stringify(options));
  // client.subscribe("/a", { qos: 0 });
  // client.publish("a/", "wss secure connection demo...!", { qos: 0, retain: false });
  // client.end();
  // mqttAgent.client.subscribe(['Zone1/#', 'Zone2/#', 'Zone3/#']);
  // mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + "/LWT", "Online", { qos: 0, retain: true });
});

import * as handlers from './mqttHandlers/index.js';

/**
 * Maps MQTT topics to their respective handler functions.
 * When a message is received on a subscribed topic, the corresponding handler function is called.
 * The topic keys are dynamically generated using configuration values to ensure flexibility.
 * @type {Object.<string, Function>}
 */
const topicHandlers = {
  [cfg.get('mqtt.outsideSensorTopic')]: handlers.handleOutsideSensor,
  [cfg.getWithMQTTPrefix('mqtt.highSetpointSetTopic')]: handlers.handleHighSetpointSet,
  [cfg.getWithMQTTPrefix('mqtt.lowSetpointSetTopic')]: handlers.handleLowSetpointSet,
  [cfg.getWithMQTTPrefix('mqtt.ventOnDeltaSecsSetTopic')]: handlers.handleVentOnDeltaSecsSet,
  [cfg.getWithMQTTPrefix('mqtt.ventOffDeltaSecsSetTopic')]: handlers.handleVentOffDeltaSecsSet,
  [cfg.getWithMQTTPrefix('mqtt.ventOnDarkSecsSetTopic')]: handlers.handleVentOnDarkSecsSet,
  [cfg.getWithMQTTPrefix('mqtt.ventOffDarkSecsSetTopic')]: handlers.handleVentOffDarkSecsSet,
};

/**
 * Event listener for incoming MQTT messages.
 * It dispatches the message to the appropriate handler function based on the topic.
 * @param {string} topic - The MQTT topic the message was received on.
 * @param {Buffer} message - The payload of the MQTT message.
 */
mqttAgent.client.on('message', (topic, message) => {
  const handler = topicHandlers[topic];
  if (handler) {
    handler(topic, message);
  } else {
    logger.error(`Topic- ${topic} - is not recognised.`);
  }
});
