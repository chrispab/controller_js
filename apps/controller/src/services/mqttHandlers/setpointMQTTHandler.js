import handleMessage from './genericHandler.js';
import { stateManager } from '../../controlLoop.js';
import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';

function createSetpointLogic(configKey, statusKey, publishTopicKey) {
  return function(topic, value) {
    const numericValue = Number(value);
    if (!isNaN(numericValue) && value.length > 0) {
      cfg.set(configKey, numericValue);
      stateManager.update({ [statusKey]: numericValue });
      utils.logAndPublishState(`MQTT->${configKey}: `, cfg.getWithMQTTPrefix(publishTopicKey), numericValue);
    } else {
      logger.error(`MQTT->${configKey}/set: INVALID non-numeric PAYLOAD RECEIVED: ${value}`);
    }
  };
}

export const handleHighSetpointSet = (topic, payload) => 
  handleMessage(topic, payload, createSetpointLogic('zone.highSetpoint', 'highSetpoint', 'mqtt.highSetpointTopic'));

export const handleLowSetpointSet = (topic, payload) => 
  handleMessage(topic, payload, createSetpointLogic('zone.lowSetpoint', 'lowSetpoint', 'mqtt.lowSetpointTopic'));
