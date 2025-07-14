import logger from './logger.js';
import cfg from './config.js';

import wifi from 'node-wifi';
import mqtt from 'mqtt';

const logLevel = 'debug';

import * as utils from '../utils/utils.js';
 
import secret from '../secret.js';
 
import nodemailer from 'nodemailer';
import * as handlers from './mqttHandlers/index.js';

// Initialize wifi module
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
    this.client = null; // Initialize client as null
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

  async initialize() {
    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(cfg.get('mqtt.brokerUrl'), this.options);

      this.client.on('connect', () => {
        logger.info('MQTT client connected:' + JSON.stringify(this.options));
        this.client.subscribe([
          cfg.getWithMQTTPrefix('mqtt.highSetpointSetTopic'),
          cfg.getWithMQTTPrefix('mqtt.lowSetpointSetTopic'),
          cfg.getWithMQTTPrefix('mqtt.ventOnDeltaSecsSetTopic'),
          cfg.getWithMQTTPrefix('mqtt.ventOffDeltaSecsSetTopic'),
          cfg.get('mqtt.outsideSensorTopic'), //has no zone prefix
          cfg.getWithMQTTPrefix('mqtt.ventOnDarkSecsSetTopic'),
          cfg.getWithMQTTPrefix('mqtt.ventOffDarkSecsSetTopic'),
        ]);

        this.client.publish(cfg.getWithMQTTPrefix('mqtt.LWTTopic'), 'Online', {
          qos: 0,
          retain: true,
        });
        resolve();
      });

      this.client.on('error', (error) => {
        logger.error('MQTT client error:', error);
        reject(error);
      });

      const topicHandlers = {
        [cfg.get('mqtt.outsideSensorTopic')]: handlers.handleOutsideSensor,
        [cfg.getWithMQTTPrefix('mqtt.highSetpointSetTopic')]: handlers.handleHighSetpoint.bind(null, this),
        [cfg.getWithMQTTPrefix('mqtt.lowSetpointSetTopic')]: handlers.handleLowSetpoint.bind(null, this),
        [cfg.getWithMQTTPrefix('mqtt.ventOnDeltaSecsSetTopic')]: handlers.handleVentOnDeltaSecsSet.bind(null, this),
        [cfg.getWithMQTTPrefix('mqtt.ventOffDeltaSecsSetTopic')]: handlers.handleVentOffDeltaSecs.bind(null, this),
        [cfg.getWithMQTTPrefix('mqtt.ventOnDarkSecsSetTopic')]: handlers.handleVentOnDarkSecs.bind(null, this),
        [cfg.getWithMQTTPrefix('mqtt.ventOffDarkSecsSetTopic')]: handlers.handleVentOffDarkSecs.bind(null, this),
      };

      this.client.on('message', (topic, message) => {
        const handler = topicHandlers[topic];
        if (handler) {
          handler(topic, message);
        } else {
          logger.error(`Topic- ${topic} - is not recognised.`);
        }
      });
    });
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
    } else {
      logger.log(logLevel, "globally disabled telemetry")
    }
    this.periodicPublication();
  }

  doTelemetry(components) {
    if (this.lastTelemetryMs + this.telemetryIntervalMs < Date.now()) {
      this.lastTelemetryMs = Date.now();
      const data = this.getTelemetryData(components);
      utils.logAndPublishState(this, 'mqttdoTelemetry', cfg.getWithMQTTPrefix('mqtt.telemetryTopic'), data);
    }
  }

  periodicPublication() {
    if (Date.now() >= this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs) {
      this.lastPeriodicPublishedMs = Date.now();
      // highSetpoint
      utils.logAndPublishState(this, 'mqtt P', cfg.getWithMQTTPrefix('mqtt.highSetpointTopic'), `${cfg.get('zone.highSetpoint')}`);
      // lowSetpoint
      utils.logAndPublishState(this, 'mqtt P', cfg.getWithMQTTPrefix('mqtt.lowSetpointTopic'), `${cfg.get('zone.lowSetpoint')}`);
      // activeSetpoint
      utils.logAndPublishState(this, 'mqtt P', cfg.getWithMQTTPrefix('mqtt.activeSetpointTopic'), this.activeSetpoint);
      //version
      utils.logAndPublishState(this, 'mqtt P', cfg.getWithMQTTPrefix('mqtt.versionTopic'), this.version);

      //publish wifi info
      wifi.getCurrentConnections((error, currentConnections) => {
        if (error) {
          console.log(error);
        } else {
          utils.logAndPublishState(this, 'mqtt P: ', cfg.getWithMQTTPrefix('mqtt.rssiTopic'), `${currentConnections[0].quality}`);
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

export default MqttAgent;