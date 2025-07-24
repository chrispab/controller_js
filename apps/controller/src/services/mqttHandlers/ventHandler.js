import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';


/**
 * Generic handler for MQTT messages related to vent settings.
 * It parses the message payload as a number, validates it, and then updates the configuration.
 * The value is converted from seconds to milliseconds before being stored in the configuration.
 * @param {string} topic - The MQTT topic the message was received on.
 * @param {Buffer} message - The payload of the MQTT message, expected to be a numeric value in seconds.
 * @param {string} configKey - The configuration path where the value should be stored (e.g., 'vent.onMs').
 * @param {string} topicKey - The MQTT topic key used for logging and publishing the state (e.g., 'mqtt.ventOnDeltaSecsTopic').
 */
function handleVent(topic, message, configKey, topicKey) {
  const value = Number(message.toString());

  //insert logging statement
  logger.warn("................topic: "+ topic + " message: " + message + " configKey: " + configKey + " topicKey: " + topicKey);
  
  if (value > 0) {
    utils.logAndPublishState(`${configKey}: `, cfg.getWithMQTTPrefix(topicKey), `${value}`);
    cfg.set(configKey, value * 1000);
  } else {
    logger.error(`MQTT->${configKey}/set: INVALID PAYLOAD RECEIVED: ${message}`);
  }
}

/**
 * Handles MQTT messages for setting the vent's various durations in seconds.
 * Converts the received message payload to milliseconds and updates the configuration.
 * @param {string} topic - The MQTT topic the message was received on.
 * @param {Buffer} message - The payload of the MQTT message, representing the duration in seconds.
 */
export function handleVentOnDeltaSecsSet(topic, message) {
  handleVent(topic, message, 'vent.onMs', 'mqtt.ventOnDeltaSecsTopic');
}

export function handleVentOffDeltaSecsSet(topic, message) {
  handleVent(topic, message, 'vent.offMs', 'mqtt.ventOffDeltaSecsTopic');
}

export function handleVentOnDarkSecsSet(topic, message) {
  handleVent(topic, message, 'vent.ventOnDarkMs', 'mqtt.ventOnDarkSecsTopic');
}

export function handleVentOffDarkSecsSet(topic, message) {
  handleVent(topic, message, 'vent.ventOffDarkMs', 'mqtt.ventOffDarkSecsTopic');
}
