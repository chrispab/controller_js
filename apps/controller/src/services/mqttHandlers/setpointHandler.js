import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';
import { controllerStatus, updateStausAndWSBroadcastStatusIfValueChanged } from '../../controlLoop.js';

/**
 * Handles MQTT messages for setting a temperature setpoint.
 * It parses the message payload as a number, validates it, and then updates the configuration.
 * @param {string} recievedTopic - The MQTT recievedTopic the payload was received on.
 * @param {Buffer} payload - The payload of the MQTT payload, expected to be a numeric value.
 * @param {string} configKey - The configuration path where the value should be stored (e.g., 'zone.highSetpoint').
 * @param {string} publishTopicKey - The configuration path MQTT publishTopicKey key used for logging and publishing the state (e.g., 'mqtt.highSetpointTopic').
 */
function handleSetpoint(recievedTopic, payload, configKey, publishTopicKey) {
  const value = Number(payload.toString());

  logger.warn(`VVVVVVVVVVV handleSetpoint recievedTopic: ${recievedTopic} payload: ${payload} configKey: ${configKey} publishTopicKey: ${publishTopicKey}`);

  // Check if the payload is a valid number and not empty.
  if (!isNaN(value) && payload.toString().length > 0) {
    utils.logAndPublishState(`handleSetpoint MQTT->${configKey}: `, cfg.getWithMQTTPrefix(publishTopicKey), `${value}`);
    cfg.set(configKey, value);

    //determine if setting hi or low setpoint
    if (configKey === 'zone.highSetpoint') {
      controllerStatus.highSetpoint = value;
      updateStausAndWSBroadcastStatusIfValueChanged('highSetpoint', value);
    } else if (configKey === 'zone.lowSetpoint') {
      controllerStatus.lowSetpoint = value;
      updateStausAndWSBroadcastStatusIfValueChanged('lowSetpoint', value);
    }

    // update controller frontend to show the new value recieved
    // updateStausAndWSBroadcastStatusIfValueChanged('controllerStatusKey', value);
  } else {
    logger.error(`MQTT->${configKey}/set: INVALID non-numeric PAYLOAD RECEIVED: ${payload}`);
  }
}

export function handleHighSetpointSet(recievedTopic, payload) {
  handleSetpoint(recievedTopic, payload, 'zone.highSetpoint', 'mqtt.highSetpointTopic');
}

export function handleLowSetpointSet(recievedTopic, payload) {
  handleSetpoint(recievedTopic, payload, 'zone.lowSetpoint', 'mqtt.lowSetpointTopic');
}
