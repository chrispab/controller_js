import handleMessage from './genericHandler.js';
import { stateManager } from '../../controlLoop.js';
import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';

function createVentDurationLogic(configKey, publishTopicKey) {
  return function(topic, value) {
    const numericValue = Number(value);
    if (numericValue > 0) {
      stateManager.update({ [configKey]: numericValue });
      utils.logAndPublishState(`MQTT->${configKey}: `, cfg.getWithMQTTPrefix(publishTopicKey), numericValue);
    } else {
      logger.error(`MQTT->${configKey}/set: INVALID PAYLOAD RECEIVED: ${value}`);
    }
  };
}

export const handleVentOnDurationDaySecsSet = (topic, payload) => 
  handleMessage(topic, payload, createVentDurationLogic('ventOnDurationDaySecs', 'mqtt.ventOnDurationDaySecsTopic'));

export const handleVentOffDurationDaySecsSet = (topic, payload) => 
  handleMessage(topic, payload, createVentDurationLogic('ventOffDurationDaySecs', 'mqtt.ventOffDurationDaySecsTopic'));

export const handleVentOnDurationNightSecsSet = (topic, payload) => 
  handleMessage(topic, payload, createVentDurationLogic('ventOnDurationNightSecs', 'mqtt.ventOnDurationNightSecsTopic'));

export const handleVentOffDurationNightSecsSet = (topic, payload) => 
  handleMessage(topic, payload, createVentDurationLogic('ventOffDurationNightSecs', 'mqtt.ventOffDurationNightSecsTopic'));
