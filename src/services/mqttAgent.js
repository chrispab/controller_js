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
    utils.sendEmail('zone startup', 'zone startup');
  }

  getName() {
    return this.name;
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
      utils.logAndPublishState('mqttPeriodic', cfg.getFull('mqtt.highSetpointTopic'), `${cfg.get('zone.highSetpoint')}`);
      // lowSetpoint
      utils.logAndPublishState('mqttPeriodic', cfg.getFull('mqtt.lowSetpointTopic'), `${cfg.get('zone.lowSetpoint')}`);

      //publish wifi info
      wifi.getCurrentConnections((error, currentConnections) => {
        if (error) {
          console.log(error);
        } else {
          utils.logAndPublishState('wifiPeriodic', cfg.getFull('mqtt.rssiTopic'), `${currentConnections[0].quality}`);
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
  // logger.warn(`MQTT->msg Received: ${topic}: ${message}`);

  switch (topic) {
    case cfg.get('mqtt.outsideSensorTopic'):
      if (message) {
        const obj = JSON.parse(message.toString());
        const temp = obj['DS18B20-1']['Temperature'];
        logger.log(logLevel, 'MQTT<-Outside_Sensor: ' + `${cfg.get('mqtt.outsideSensorTopic') + temp}`);
        // now set the global outside temperature variable
        mqttAgent.outsideTemperature = temp;
      } else {
        logger.log('error', 'MQTT->Outside_Sensor: NULL PAYLOAD RECEIVED');
      }
      break;

    case cfg.get('mqtt.topicPrefix') + '/high_setpoint/set':
      if (Number(message.toString()) > 0) {
        utils.logAndPublishState('highSetpoint: ', cfg.getFull('mqtt.highSetpointTopic'), `${message}`);
        //set the high setpoint in the config object
        const obj1 = { zone: { highSetpoint: Number(message.toString()) } };
        cfg.set('zone.highSetpoint', obj1);
      } else {
        logger.log('error', 'MQTT->highSetpoint/set: NULL PAYLOAD RECEIVED');
      }
      break;

    case cfg.get('mqtt.topicPrefix') + '/low_setpoint/set':
      if (Number(message.toString()) > 0) {
        utils.logAndPublishState('lowSetpoint: ', cfg.getFull('mqtt.lowSetpointTopic'), `${message}`);
        //set the low setpoint in the config object
        const obj2 = { zone: { lowSetpoint: Number(message.toString()) } };
        cfg.set('zone.lowSetpoint', obj2);
      } else {
        logger.log('error', 'MQTT->lowSetpoint/set: NULL PAYLOAD RECEIVED');
      }
      break;

    case cfg.get('mqtt.topicPrefix') + '/vent_on_delta_secs/set':
      if (Number(message.toString()) > 0) {
        utils.logAndPublishState('vent_on_delta_secs: ', cfg.getFull('mqtt.ventOnDeltaSecsTopic'), `${message}`);
        //set in the config object
        const obj3 = { vent: { onMs: Number(message.toString()) * 1000 } };
        cfg.set('vent.onMs', obj3);
      } else {
        logger.log('error', 'MQTT->vent_on_delta_secs/set: NULL PAYLOAD RECEIVED');
      }
      break;

    case cfg.get('mqtt.topicPrefix') + '/vent_off_delta_secs/set':
      if (Number(message.toString()) > 0) {
        utils.logAndPublishState('vent_off_delta_secs: ', cfg.getFull('mqtt.ventOffDeltaSecsTopic'), `${message}`);
        //set in the config object
        const obj4 = { vent: { offMs: Number(message.toString()) * 1000 } };
        cfg.set('vent.offMs', obj4);
      } else {
        logger.log('error', 'MQTT->vent_off_delta_secs/set: NULL PAYLOAD RECEIVED');
      }
      break;

    default:
      logger.error(`Topic- ${topic} - is not recognised.`);
  }
});
