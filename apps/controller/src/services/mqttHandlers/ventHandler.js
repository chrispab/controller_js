import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';
import { updateAndBroadcastStatusIfValueChanged } from '../../controlLoop.js';


/**
 * Generic handler for MQTT messages related to vent settings.
 * It parses the message payload as a number, validates it, and then updates the configuration.
 * The value is converted from seconds to milliseconds before being stored in the configuration.
 * @param {string} topic - The MQTT topic the message was received on.
 * @param {Buffer} message - The payload of the MQTT message, expected to be a numeric value in seconds.
 * @param {string} controllerStatusKey - The configuration path where the value should be stored (e.g., 'vent.onMs').
 * @param {string} topicKey - The MQTT topic key used for logging and publishing the state (e.g., 'mqtt.ventOnDeltaSecsTopic').
 */
function handleVent(receivedTopic, payload, controllerStatusKey, publishTopicKey) {
  const value = Number(payload.toString());

  //insert logging statement
  logger.warn("..........receivedTopic: "+ receivedTopic + " message: " + payload + " configKey: " + controllerStatusKey + " topicKey: " + publishTopicKey);
  
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
 * Handles MQTT messages for setting the vent's various durations in seconds.
 * Converts the received message payload to milliseconds and updates the configuration.
 * @param {string} topic - The MQTT topic the message was received on.
 * @param {Buffer} message - The payload of the MQTT message, representing the duration in seconds.
 */
export function handleVentOnDurationDaySecsSet(topic, message) {
  handleVent(topic, message, 'ventOnDurationDaySecs', 'mqtt.ventOnDurationDaySecsTopic');
}

export function handleVentOffDurationDaySecsSet(topic, message) {
  handleVent(topic, message, 'ventOffDurationDaySecs', 'mqtt.ventOffDurationDaySecsTopic');
}

export function handleVentOnDurationNightSecsSet(topic, message) {
  handleVent(topic, message, 'ventOnDurationNightSecs', 'mqtt.ventOnDurationNightSecsTopic');
}

export function handleVentOffDurationNightSecsSet(topic, message) {
  handleVent(topic, message, 'ventOffDurationNightSecs', 'mqtt.ventOffDurationNightSecsTopic');
}
