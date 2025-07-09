import logger from './logger.js';
import cfg from './config.js';

import wifi from 'node-wifi';
import mqtt from 'mqtt';

const logLevel = 'debug';

import * as utils from '../utils/utils.js';
// eslint-disable-next-line no-unused-vars
import secret from '../secret.js';
// eslint-disable-next-line no-unused-vars
import nodemailer from 'nodemailer';

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
        topic: cfg.getFull('mqtt.LWTTopic'),
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
    }
    this.processPeriodicPublication();
  }

  doTelemetry(components) {
    if (this.lastTelemetryMs + this.telemetryIntervalMs < Date.now()) {
      this.lastTelemetryMs = Date.now();
      const data = this.getTelemetryData(components);
      utils.logAndPublishState('mqttdoTelemetry', cfg.getFull('mqtt.telemetryTopic'), data);
    }
  }

  processPeriodicPublication() {
    if (Date.now() >= this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs) {
      this.lastPeriodicPublishedMs = Date.now();
      // highSetpoint
      utils.logAndPublishState('mqtt P highSetpoint', cfg.getFull('mqtt.highSetpointTopic'), `${cfg.get('zone.highSetpoint')}`);
      // lowSetpoint
      utils.logAndPublishState('mqtt P lowSetpoint', cfg.getFull('mqtt.lowSetpointTopic'), `${cfg.get('zone.lowSetpoint')}`);
      // activeSetpoint
      utils.logAndPublishState('mqtt P activeSetpoint', cfg.getFull('mqtt.activeSetpointTopic'), this.activeSetpoint);
      //version
      utils.logAndPublishState('mqtt P version', cfg.getFull('mqtt.versionTopic'), this.version);

      //publish wifi info
      wifi.getCurrentConnections((error, currentConnections) => {
        if (error) {
          console.log(error);
        } else {
          utils.logAndPublishState('rssi P', cfg.getFull('mqtt.rssiTopic'), `${currentConnections[0].quality}`);
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
    cfg.getFull('mqtt.highSetpointSetTopic'),
    cfg.getFull('mqtt.lowSetpointSetTopic'),
    cfg.getFull('mqtt.ventOnDeltaSecsSetTopic'),
    cfg.getFull('mqtt.ventOffDeltaSecsSetTopic'),
    cfg.getFull('mqtt.outsideSensorTopic'),
  ]);

  mqttAgent.client.publish(cfg.getFull('mqtt.LWTTopic'), 'Online', {
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

mqttAgent.client.on('message', (topic, message) => {
  logger.info(`MQTT<->msg Received: ${topic}: ${message}`);

  switch (topic) {
    case cfg.get('mqtt.outsideSensorTopic'): {
      if (!message || message.length === 0) {
        logger.error('MQTT->Outside_Sensor: NULL OR EMPTY PAYLOAD RECEIVED');
        break;
      }
      try {
        const obj = JSON.parse(message.toString());
        // Use optional chaining for safer property access. The sensor name could be from config.
        const sensorName = cfg.get('mqtt.outsideSensorName') || 'DS18B20-1';
        const temperature = obj?.[sensorName]?.['Temperature'];

        if (typeof temperature !== 'undefined') {
          logger.log(logLevel, `MQTT<-Outside_Sensor: ${topic} temperature: ${temperature}`);
          mqttAgent.outsideTemperature = temperature;
        } else {
          logger.error(`MQTT->Outside_Sensor: Could not extract temperature from payload: ${message.toString()}`);
        }
      } catch (e) {
        logger.error(`MQTT->Outside_Sensor: Failed to parse JSON payload: ${message.toString()}`, e);
      }
      break;
    }
    case cfg.getFull('mqtt.highSetpointSetTopic'): {
      const value = Number(message.toString());
      if (value > 0) {
        utils.logAndPublishState('highSetpoint: ', cfg.getFull('mqtt.highSetpointTopic'), `${value}`);
        cfg.set('zone.highSetpoint', value);
      } else {
        logger.error(`MQTT->highSetpoint/set: INVALID PAYLOAD RECEIVED: ${message}`);
      }
      break;
    }
    case cfg.getFull('mqtt.lowSetpointSetTopic'): {
      const value = Number(message.toString());
      if (value > 0) {
        utils.logAndPublishState('lowSetpoint: ', cfg.getFull('mqtt.lowSetpointTopic'), `${value}`);
        cfg.set('zone.lowSetpoint', value);
      } else {
        logger.error(`MQTT->lowSetpoint/set: INVALID PAYLOAD RECEIVED: ${message}`);
      }
      break;
    }
    case cfg.getFull('mqtt.ventOnDeltaSecsSetTopic'): {
      const value = Number(message.toString());
      if (value > 0) {
        utils.logAndPublishState('vent_on_delta_secs: ', cfg.getFull('mqtt.ventOnDeltaSecsTopic'), `${value}`);
        cfg.set('vent.onMs', value * 1000);
      } else {
        logger.error(`MQTT->vent_on_delta_secs/set: INVALID PAYLOAD RECEIVED: ${message}`);
      }
      break;
    }
    case cfg.getFull('mqtt.ventOffDeltaSecsSetTopic'): {
      const value = Number(message.toString());
      if (value > 0) {
        utils.logAndPublishState('vent_off_delta_secs: ', cfg.getFull('mqtt.ventOffDeltaSecsTopic'), `${value}`);
        cfg.set('vent.offMs', value * 1000);
      } else {
        logger.error(`MQTT->vent_off_delta_secs/set: INVALID PAYLOAD RECEIVED: ${message}`);
      }
      break;
    }
    default:
      logger.error(`Topic- ${topic} - is not recognised.`);
  }
});
