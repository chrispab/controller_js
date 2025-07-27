import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';

function handleSetpoint(topic, message, configKey, topicKey) {
  const value = Number(message.toString());
  // Check if the payload is a valid number and not empty.
  if (!isNaN(value) && message.toString().length > 0) {
    utils.logAndPublishState(
      `${configKey}: `,
      cfg.getWithMQTTPrefix(topicKey),
      `${value}`,
    );
    cfg.set(configKey, value);
  } else {
    logger.error(
      `MQTT->${configKey}/set: INVALID non-numeric PAYLOAD RECEIVED: ${message}`,
    );
  }
}

export function handleHighSetpointSet(topic, message) {
  handleSetpoint(topic, message, 'zone.highSetpoint', 'mqtt.highSetpointTopic');
}

export function handleLowSetpointSet(topic, message) {
  handleSetpoint(topic, message, 'zone.lowSetpoint', 'mqtt.lowSetpointTopic');
}
