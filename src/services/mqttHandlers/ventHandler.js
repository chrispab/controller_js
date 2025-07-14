import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';

/**
 * Handles incoming MQTT messages for vent-related settings.
 * Converts the message payload to a number, validates it, and updates the configuration.
 * @param {string} topic - The MQTT topic the message was received on.
 * @param {Buffer} message - The MQTT message payload.
 * @param {string} configKey - The configuration key to update (e.g., 'vent.onMs').
 * @param {string} topicKey - The MQTT topic key for publishing (e.g., 'mqtt.ventOnDeltaSecsTopic').
 */
function handleVent(mqttAgent, topic, message, configKey, topicKey) {
  // Convert the message payload to a number
  const value = Number(message.toString());

  //insert lerrogging statement
  logger.error('topic: ' + topic + ', message: ' + message + ', configKey: ' + configKey + ', topicKey: ' + topicKey + ', value: ' + value);

  if (value > 0) {
    utils.logAndPublishState(mqttAgent, `${configKey} S`, cfg.getWithMQTTPrefix(topicKey), `${value}`);
    //write new rxed value into config
    cfg.set(configKey, value * 1000);

  } else {
    logger.error(`MQTT->${configKey}/set: INVALID PAYLOAD RECEIVED: ${message}`);
  }
}

export function handleVentOnDeltaSecsSet(mqttAgent, topic, message) {
  handleVent(mqttAgent, topic, message, 'vent.onMs', 'mqtt.ventOnDeltaSecsTopic');
}

export function handleVentOffDeltaSecs(mqttAgent, topic, message) {
  handleVent(mqttAgent, topic, message, 'vent.offMs', 'mqtt.ventOffDeltaSecsTopic');
}

export function handleVentOnDarkSecs(mqttAgent, topic, message) {
  handleVent(mqttAgent, topic, message, 'vent.ventOnDarkMs', 'mqtt.ventOnDarkSecsTopic');
}

export function handleVentOffDarkSecs(mqttAgent, topic, message) {
  handleVent(mqttAgent, topic, message, 'vent.ventOffDarkMs', 'mqtt.ventOffDarkSecsTopic');
}