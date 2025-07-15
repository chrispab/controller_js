
import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';

function handleSetpoint(topic, message, configKey, topicKey) {
  const value = Number(message.toString());
  if (value > 0) {
    utils.logAndPublishState(`${configKey}: `, cfg.getWithMQTTPrefix(topicKey), `${value}`);
    cfg.set(configKey, value);
  } else {
    logger.error(`MQTT->${configKey}/set: INVALID PAYLOAD RECEIVED: ${message}`);
  }
}

export function handleHighSetpointSet(topic, message) {
  handleSetpoint(topic, message, 'zone.highSetpoint', 'mqtt.highSetpointTopic');
}

export function handleLowSetpointSet(topic, message) {
  handleSetpoint(topic, message, 'zone.lowSetpoint', 'mqtt.lowSetpointTopic');
}
