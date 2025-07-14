
import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';

function handleVent(topic, message, configKey, topicKey) {
  const value = Number(message.toString());

  //insert lerrogging statement
  logger.error("test error message");
  
  if (value > 0) {
    utils.logAndPublishState(`${configKey}: `, cfg.getWithMQTTPrefix(topicKey), `${value}`);
    cfg.set(configKey, value * 1000);
  } else {
    logger.error(`MQTT->${configKey}/set: INVALID PAYLOAD RECEIVED: ${message}`);
  }
}

export function handleVentOnDeltaSecs(topic, message) {
  handleVent(topic, message, 'vent.onMs', 'mqtt.ventOnDeltaSecsTopic');
}

export function handleVentOffDeltaSecs(topic, message) {
  handleVent(topic, message, 'vent.offMs', 'mqtt.ventOffDeltaSecsTopic');
}

export function handleVentOnDarkSecs(topic, message) {
  handleVent(topic, message, 'vent.ventOnDarkMs', 'mqtt.ventOnDarkSecsTopic');
}

export function handleVentOffDarkSecs(topic, message) {
  handleVent(topic, message, 'vent.ventOffDarkMs', 'mqtt.ventOffDarkSecsTopic');
}
