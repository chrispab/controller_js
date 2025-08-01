import handleMessage from './genericHandler.js';
import { stateManager } from '../../controlLoop.js';
import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';

function createFanDurationLogic(configKey, publishTopicKey) {
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

export const handleFanOnDurationSecsSet = (topic, payload) => 
  handleMessage(topic, payload, createFanDurationLogic('fanOnDurationSecs', 'mqtt.fanOnDurationSecsTopic'));

export const handleFanOffDurationSecsSet = (topic, payload) => 
  handleMessage(topic, payload, createFanDurationLogic('fanOffDurationSecs', 'mqtt.fanOffDurationSecsTopic'));
