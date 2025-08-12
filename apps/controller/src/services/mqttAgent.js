import logger from './logger.js';
import cfg from './config.js';

import wifi from 'node-wifi';
import mqtt from 'mqtt';

import * as utils from '../utils/utils.js';

// import secret from '../secret.js';

// import nodemailer from 'nodemailer';
// import { controllerStatus, updateStausAndWSBroadcastStatusIfValueChanged } from '../controlLoop.js';
// import { warn } from 'winston';

// const wifi = require('node-wifi');
// Initialize wifi module
// Absolutely necessary even to set interface to null
wifi.init({
  iface: null, // network interface, choose a random wifi interface if set to null
});

class MqttAgent {
  constructor() {
    try {
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
      this.periodicPublishIntervalMs = cfg.get('mqtt.periodicPublishIntervalMs');
      this.lastPeriodicPublishedMs = Date.now() - this.periodicPublishIntervalMs;
      this.outsideTemperature = 7;
      this.activeSetpoint = 0;
      this.version = cfg.get('version');
      this.zoneName = cfg.get('zone.name');
    } catch (error) {
      logger.error(`Error in MqttAgent constructor: ${error.message}`, {
        stack: error.stack,
      });
    }
  }

  // sendStartupEmail() {
  //   utils.sendEmail(this.zoneName + ' startup', 'zone startup');
  // }

  getPeriodicPublishIntervalMs() {
    return this.periodicPublishIntervalMs;
  }

  getName() {
    return this.name;
  }

  setactiveSetpoint(activeSetpoint) {
    this.activeSetpoint = activeSetpoint;
  }

  process(components) {
    try {
      this.processCount = this.processCount ? this.processCount + 1 : 1;

      this.reloadSettingsIfChanged();

      if (cfg.get('zone.telemetry.enabled') == true) {
        this.doTelemetry(components);
      } else {
        // logger.info("globally disabled telemetry")
      }
      this.periodicPublication();
    } catch (error) {
      logger.error(`Error in MqttAgent process method: ${error.message}`, {
        stack: error.stack,
      });
    }
  }

  /**
   * Checks for and applies changes to the high and low temperature setpoints from the configuration.
   * If a change in `zone.highSetpoint` or `zone.lowSetpoint` is detected in the configuration,
   * this method updates the agent's internal state and publishes the new value to the
   * respective MQTT topic. It ensures the agent's settings remain synchronized with the
   * application's dynamic configuration.
   */
  reloadSettingsIfChanged() {
    try {
      if (this.highSetpoint != cfg.get('zone.highSetpoint')) {
        this.highSetpoint = cfg.get('zone.highSetpoint');
        utils.logAndPublishState('mqttAgent R', cfg.getWithMQTTPrefix('mqtt.highSetpointTopic'), `${this.highSetpoint}`);
        logger.debug(`highSetpoint changed to ${this.highSetpoint}`);
      }
      if (this.lowSetpoint != cfg.get('zone.lowSetpoint')) {
        this.lowSetpoint = cfg.get('zone.lowSetpoint');
        utils.logAndPublishState('mqttAgent R', cfg.getWithMQTTPrefix('mqtt.lowSetpointTopic'), `${this.lowSetpoint}`);
        logger.debug(`lowSetpoint changed to ${this.lowSetpoint}`);
      }
    } catch (error) {
      logger.error(`Error in MqttAgent reloadSettingsIfChanged: ${error.message}`, { stack: error.stack });
    }
  }

  doTelemetry(components) {
    try {
      if (this.lastTelemetryMs + this.telemetryIntervalMs < Date.now()) {
        this.lastTelemetryMs = Date.now();
        const data = this.getTelemetryData(components);
        utils.logAndPublishState('mqttdoTelemetry', cfg.getWithMQTTPrefix('mqtt.telemetryTopic'), data);
      }
    } catch (error) {
      logger.error(`Error in MqttAgent doTelemetry: ${error.message}`, {
        stack: error.stack,
      });
    }
  }

  periodicPublication() {
    try {
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
            logger.error('getCurrentConnections error', { error });
          } else {
            utils.logAndPublishState('mqtt P', cfg.getWithMQTTPrefix('mqtt.rssiTopic'), `${currentConnections[0].quality}`);
          }
        });

        //send heartbeat mqtt
        // this.client.publish(cfg.getWithMQTTPrefix('mqtt.heartbeatTopic'),'GGG');
        utils.logAndPublishState('mqtt P', cfg.getWithMQTTPrefix('mqtt.heartbeatTopic'), 'GGG');
      }
    } catch (error) {
      logger.error(`Error in MqttAgent periodicPublication: ${error.message}`, {
        stack: error.stack,
      });
    }
  }

  getTelemetryData(components) {
    const componentData = [];
    for (const component of components) {
      try {
        var teledata = component.getTelemetryData();
        const obj1 = JSON.parse(JSON.stringify(teledata));
        componentData.push(JSON.stringify(obj1));
      } catch (error) {
        logger.error(`Error getting telemetry data for component: ${component.name || 'unknown'}, Error: ${error.message}`, { stack: error.stack });
      }
    }
    return componentData.toString();
  }

  publish(topic, message, options) {
    this.client.publish(topic, message, options);
  }
}

//export an instance so single instance can be used
export const mqttAgent = new MqttAgent();
export default mqttAgent;

/**
 * Event handler for when the MQTT client connects to the broker.
 * Subscribes to various MQTT topics and publishes the Last Will and Testament (LWT) message.
 */
mqttAgent.client.on('connect', function () {
  logger.info('MQTT client connected:' + JSON.stringify(mqttAgent.options));

  // mqtt subscriptions
  mqttAgent.client.subscribe([
    cfg.getWithMQTTPrefix('mqtt.highSetpointSetTopic'),
    cfg.getWithMQTTPrefix('mqtt.lowSetpointSetTopic'),
    cfg.getWithMQTTPrefix('mqtt.ventOnDurationDaySecsSetTopic'),
    cfg.getWithMQTTPrefix('mqtt.ventOffDurationDaySecsSetTopic'),
    cfg.getWithMQTTPrefix('mqtt.ventOnDurationNightSecsSetTopic'),
    cfg.getWithMQTTPrefix('mqtt.ventOffDurationNightSecsSetTopic'),
    cfg.getWithMQTTPrefix('mqtt.fanOnDurationSecsSetTopic'),
    cfg.getWithMQTTPrefix('mqtt.fanOffDurationSecsSetTopic'),
    cfg.get('mqtt.outsideSensorTopic'), //has no zone prefix
    cfg.get('mqtt.soilMoisturePercentTopic'), //has no zone prefix
    'soil1/sensor_method5_batch_moving_average_float',
    'irrigationPump/status',
  ]);

  mqttAgent.client.publish(cfg.getWithMQTTPrefix('mqtt.LWTTopic'), 'Online', {
    qos: 0,
    retain: true,
  });
});

/**
 * Event handler for when the MQTT client sends a packet.
 * Currently, this function is mostly a placeholder and logs a warning.
 */
mqttAgent.client.on('packetsend', function () {
  // logger.warn(".........published:" + JSON.stringify(options));
  // client.subscribe("/a", { qos: 0 });
  // client.publish("a/", "wss secure connection demo...!", { qos: 0, retain: false });
  // client.end();
  // mqttAgent.client.subscribe(['Zone1/#', 'Zone2/#', 'Zone3/#']);
  // mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + "/LWT", "Online", { qos: 0, retain: true });
});

mqttAgent.client.on('error', function (err) {
  logger.error('MQTT client error:', err);
});

import * as handlers from './mqttHandlers/index.js';

/**
 * Maps MQTT topics to their respective handler functions.
 * When a message is received on a subscribed topic, the corresponding handler function is called.
 * The topic keys are dynamically generated using configuration values to ensure flexibility.
 * @type {Object.<string, Function>}
 */
const topicHandlers = {
  [cfg.getWithMQTTPrefix('mqtt.highSetpointSetTopic')]: handlers.handleHighSetpointSet,
  [cfg.getWithMQTTPrefix('mqtt.lowSetpointSetTopic')]: handlers.handleLowSetpointSet,
  [cfg.getWithMQTTPrefix('mqtt.ventOnDurationDaySecsSetTopic')]: handlers.handleVentOnDurationDaySecsSet,
  [cfg.getWithMQTTPrefix('mqtt.ventOffDurationDaySecsSetTopic')]: handlers.handleVentOffDurationDaySecsSet,
  [cfg.getWithMQTTPrefix('mqtt.ventOnDurationNightSecsSetTopic')]: handlers.handleVentOnDurationNightSecsSet,
  [cfg.getWithMQTTPrefix('mqtt.ventOffDurationNightSecsSetTopic')]: handlers.handleVentOffDurationNightSecsSet,
  [cfg.getWithMQTTPrefix('mqtt.fanOnDurationSecsSetTopic')]: handlers.handleFanOnDurationSecsSet,
  [cfg.getWithMQTTPrefix('mqtt.fanOffDurationSecsSetTopic')]: handlers.handleFanOffDurationSecsSet,
  [cfg.get('mqtt.outsideSensorTopic')]: handlers.handleOutsideSensor,
  [cfg.get('mqtt.sensorSoilMoistureRawTopic')]: handlers.handleSensorSoilMoistureRaw,
  [cfg.get('mqtt.soilMoisturePercentTopic')]: handlers.handleSoilMoisturePercent,
  [cfg.get('mqtt.irrigationPumpStateTopic')]: handlers.handleIrrigationPumpState,
};

/**
 * MQTT Event handler dispatcher for incoming  messages.
 * It dispatches the message to the appropriate handler function based on the topic.
 * @param {string} topic - The MQTT topic the message was received on.
 * @param {Buffer} message - The payload of the MQTT message.
 */
mqttAgent.client.on('message', (topic, message) => {
  // logger.info(`MQTT message received. Topic: ${topic}, Message: ${message.toString()}`);
  const handler = topicHandlers[topic];
  if (handler) {
    try {
      handler(topic, message);
    } catch (error) {
      logger.error(`Error handling MQTT message for topic ${topic}: ${error.message}`, { stack: error.stack });
    }
  } else {
    logger.error(`Topic- ${topic} - is not recognised.`);
  }
});
