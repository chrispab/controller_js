import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';

function handleSetpoint(mqttAgent, topic, message, configKey, topicKey) {
  const value = Number(message.toString());
  if (value > 0) {
    utils.logAndPublishState(mqttAgent, `${configKey}: `, cfg.getWithMQTTPrefix(topicKey), `${value}`);
    cfg.set(configKey, value);
  } else {
    logger.error(`MQTT->${configKey}/set: INVALID PAYLOAD RECEIVED: ${message}`);
  }
}

export function handleHighSetpoint(mqttAgent, topic, message) {
  handleSetpoint(mqttAgent, topic, message, 'zone.highSetpoint', 'mqtt.highSetpointTopic');
}

export function handleLowSetpoint(mqttAgent, topic, message) {
  handleSetpoint(mqttAgent, topic, message, 'zone.lowSetpoint', 'mqtt.lowSetpointTopic');
}