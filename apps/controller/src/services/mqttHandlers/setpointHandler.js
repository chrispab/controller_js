import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';

/**
 * Handles MQTT messages for setting a temperature setpoint.
 * It parses the message payload as a number, validates it, and then updates the configuration.
 * @param {string} recievedTopic - The MQTT recievedTopic the paylod was received on.
 * @param {Buffer} paylod - The payload of the MQTT paylod, expected to be a numeric value.
 * @param {string} configKey - The configuration path where the value should be stored (e.g., 'zone.highSetpoint').
 * @param {string} publishTopicKey - The MQTT recievedTopic key used for logging and publishing the state (e.g., 'mqtt.highSetpointTopic').
 */
function handleSetpoint(recievedTopic, paylod, configKey, publishTopicKey) {
  const value = Number(paylod.toString());
  // Check if the payload is a valid number and not empty.
  if (!isNaN(value) && paylod.toString().length > 0) {
    utils.logAndPublishState(
      `${configKey}: `,
      cfg.getWithMQTTPrefix(publishTopicKey),
      `${value}`,
    );
    cfg.set(configKey, value);
  } else {
    logger.error(
      `MQTT->${configKey}/set: INVALID non-numeric PAYLOAD RECEIVED: ${paylod}`,
    );
  }
}

export function handleHighSetpointSet(recievedTopic, paylod) {
  handleSetpoint(recievedTopic, paylod, 'zone.highSetpoint', 'mqtt.highSetpointTopic');
}

export function handleLowSetpointSet(recievedTopic, paylod) {
  handleSetpoint(recievedTopic, paylod, 'zone.lowSetpoint', 'mqtt.lowSetpointTopic');
}
