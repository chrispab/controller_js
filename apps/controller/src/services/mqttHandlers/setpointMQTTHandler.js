import handleMessage from './genericHandler.js';
import { updateStausAndWSBroadcastStatusIfValueChanged } from '../../controlLoop.js';
import logger from '../logger.js';
import cfg from '../config.js';

function createSetpointHandler(configKey, statusKey) {
  return function(topic, value) {
    const numericValue = Number(value);
    if (!isNaN(numericValue) && value.length > 0) {
      cfg.set(configKey, numericValue);
      updateStausAndWSBroadcastStatusIfValueChanged(statusKey, numericValue);
    } else {
      logger.error(`MQTT->${configKey}/set: INVALID non-numeric PAYLOAD RECEIVED: ${value}`);
    }
  };
}

export const handleHighSetpointSet = (topic, payload) => 
  handleMessage(topic, payload, createSetpointHandler('zone.highSetpoint', 'highSetpoint'), 'mqtt.highSetpointTopic', 'highSetpoint');

export const handleLowSetpointSet = (topic, payload) => 
  handleMessage(topic, payload, createSetpointHandler('zone.lowSetpoint', 'lowSetpoint'), 'mqtt.lowSetpointTopic', 'lowSetpoint');
