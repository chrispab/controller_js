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
    }
    this.processPeriodicPublication();
  }

  doTelemetry(components) {
    if (this.lastTelemetryMs + this.telemetryIntervalMs < Date.now()) {
      this.lastTelemetryMs = Date.now();
      const data = this.getTelemetryData(components);
      utils.logAndPublishState('mqttdoTelemetry', cfg.getWithMQTTPrefix('mqtt.telemetryTopic'), data);
    }
  }

  processPeriodicPublication() {
    if (Date.now() >= this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs) {
      this.lastPeriodicPublishedMs = Date.now();
      // highSetpoint
      utils.logAndPublishState('mqtt P highSetpoint', cfg.getWithMQTTPrefix('mqtt.highSetpointTopic'), `${cfg.get('zone.highSetpoint')}`);
      // lowSetpoint
      utils.logAndPublishState('mqtt P lowSetpoint', cfg.getWithMQTTPrefix('mqtt.lowSetpointTopic'), `${cfg.get('zone.lowSetpoint')}`);
      // activeSetpoint
      utils.logAndPublishState('mqtt P activeSetpoint', cfg.getWithMQTTPrefix('mqtt.activeSetpointTopic'), this.activeSetpoint);
      //version
      utils.logAndPublishState('mqtt P version', cfg.getWithMQTTPrefix('mqtt.versionTopic'), this.version);

      //publish wifi info
      wifi.getCurrentConnections((error, currentConnections) => {
        if (error) {
          console.log(error);
        } else {
          utils.logAndPublishState('rssi P', cfg.getWithMQTTPrefix('mqtt.rssiTopic'), `${currentConnections[0].quality}`);
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

mqttAgent.client.on('message', (topic, message) => {
  // logger.log('error', `MQTT<->msg Received: ${topic}: ${message}`);

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
          // logger.log('error', `MQTT<-Outside_Sensor: ${topic} temperature: ${temperature}`);
          mqttAgent.outsideTemperature = temperature;
        } else {
          logger.error(`MQTT->Outside_Sensor: Could not extract temperature from payload: ${message.toString()}`);
        }
      } catch (e) {
        logger.error(`MQTT->Outside_Sensor: Failed to parse JSON payload: ${message.toString()}`, e);
      }
      break;
    }
    case cfg.getWithMQTTPrefix('mqtt.highSetpointSetTopic'): {
      const value = Number(message.toString());
      if (value > 0) {
        utils.logAndPublishState('highSetpoint: ', cfg.getWithMQTTPrefix('mqtt.highSetpointTopic'), `${value}`);
        cfg.set('zone.highSetpoint', value);
      } else {
        logger.error(`MQTT->highSetpoint/set: INVALID PAYLOAD RECEIVED: ${message}`);
      }
      break;
    }
    case cfg.getWithMQTTPrefix('mqtt.lowSetpointSetTopic'): {
      const value = Number(message.toString());
      if (value > 0) {
        utils.logAndPublishState('lowSetpoint: ', cfg.getWithMQTTPrefix('mqtt.lowSetpointTopic'), `${value}`);
        cfg.set('zone.lowSetpoint', value);
      } else {
        logger.error(`MQTT->lowSetpoint/set: INVALID PAYLOAD RECEIVED: ${message}`);
      }
      break;
    }
    case cfg.getWithMQTTPrefix('mqtt.ventOnDeltaSecsSetTopic'): {
      const value = Number(message.toString());
      if (value > 0) {
        utils.logAndPublishState('vent_on_delta_secs: ', cfg.getWithMQTTPrefix('mqtt.ventOnDeltaSecsTopic'), `${value}`);
        cfg.set('vent.onMs', value * 1000);
      } else {
        logger.error(`MQTT->vent_on_delta_secs/set: INVALID PAYLOAD RECEIVED: ${message}`);
      }
      break;
    }
    case cfg.getWithMQTTPrefix('mqtt.ventOffDeltaSecsSetTopic'): {
      const value = Number(message.toString());
      if (value > 0) {
        utils.logAndPublishState('vent_off_delta_secs: ', cfg.getWithMQTTPrefix('mqtt.ventOffDeltaSecsTopic'), `${value}`);
        cfg.set('vent.offMs', value * 1000);
      } else {
        logger.error(`MQTT->vent_off_delta_secs/set: INVALID PAYLOAD RECEIVED: ${message}`);
      }
      break;
    }
    // add cases for ventDarkOnDelta and ventDarkOffDelta
    case cfg.getWithMQTTPrefix('mqtt.ventOnDarkSecsSetTopic'): {
      const value = Number(message.toString());
      if (value > 0) {
        utils.logAndPublishState('vent_on_dark_secs: ', cfg.getWithMQTTPrefix('mqtt.ventOnDarkSecsTopic'), `${value}`);
        cfg.set('vent.ventOnDarkMs', value * 1000);
      } else {
        logger.error(`MQTT->vent_on_dark_secs/set: INVALID PAYLOAD RECEIVED: ${message}`);
      }
      break;
    }
    case cfg.getWithMQTTPrefix('mqtt.ventOffDarkSecsSetTopic'): {
      const value = Number(message.toString());
      if (value > 0) {
        utils.logAndPublishState('vent_off_dark_secs: ', cfg.getWithMQTTPrefix('mqtt.ventOffDarkSecsTopic'), `${value}`);
        cfg.set('vent.ventOffDarkMs', value * 1000);
      } else {
        logger.error(`MQTT->vent_off_dark_secs/set: INVALID PAYLOAD RECEIVED: ${message}`);
      }
      break;
    }
    

    
    default:
      logger.error(`Topic- ${topic} - is not recognised.`);
  }
});
