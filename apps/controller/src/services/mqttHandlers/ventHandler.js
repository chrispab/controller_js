import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';
import { updateAndBroadcastStatusIfValueChanged } from '../../controlLoop.js';

/**
 * Generic handler for MQTT payloads related to vent settings.
 * It parses the payload payload as a number, validates it, and then updates the configuration.
 * The value is converted from seconds to milliseconds before being stored in the configuration.
 * @param {string} receivedTopic - The MQTT topic the payload was received on.
 * @param {Buffer} payload - The payload of the MQTT payload, expected to be a numeric value in seconds.
 * @param {string} controllerStatusKey - The configuration path where the value should be stored (e.g., 'vent.onMs').
 * @param {string} publishTopicKey - The MQTT topic key used for logging and publishing the state (e.g., 'mqtt.ventOnDeltaSecsTopic').
 */
function handleVent(receivedTopic, payload, controllerStatusKey, publishTopicKey) {
  const value = Number(payload.toString());

  //insert logging statement
  logger.warn(
    '..........receivedTopic: ' + receivedTopic + ' payload: ' + payload + ' configKey: ' + controllerStatusKey + ' publishTopicKey: ' + publishTopicKey,
  );

  if (value > 0) {
    utils.logAndPublishState(`${controllerStatusKey}: `, cfg.getWithMQTTPrefix(publishTopicKey), `${value}*1000`);
    cfg.set(controllerStatusKey, value);
    // update controller frontend to show the new value recieved
    updateAndBroadcastStatusIfValueChanged(controllerStatusKey, value);
  } else {
    logger.error(`MQTT->${controllerStatusKey}/set: INVALID PAYLOAD RECEIVED: ${payload}`);
  }
}

/**
 * Handles MQTT payloads for setting the vent's various durations in seconds.
 * Converts the received payload payload to milliseconds and updates the configuration.
 * @param {string} receivedTopic - The MQTT topic the payload was received on.
 * @param {Buffer} payload - The payload of the MQTT payload, representing the duration in seconds.
 */
export function handleVentOnDurationDaySecsSet(receivedTopic, payload) {
  handleVent(receivedTopic, payload, 'ventOnDurationDaySecs', 'mqtt.ventOnDurationDaySecsTopic');
}

export function handleVentOffDurationDaySecsSet(receivedTopic, payload) {
  handleVent(receivedTopic, payload, 'ventOffDurationDaySecs', 'mqtt.ventOffDurationDaySecsTopic');
}

export function handleVentOnDurationNightSecsSet(receivedTopic, payload) {
  handleVent(receivedTopic, payload, 'ventOnDurationNightSecs', 'mqtt.ventOnDurationNightSecsTopic');
}

export function handleVentOffDurationNightSecsSet(receivedTopic, payload) {
  handleVent(receivedTopic, payload, 'ventOffDurationNightSecs', 'mqtt.ventOffDurationNightSecsTopic');
}
