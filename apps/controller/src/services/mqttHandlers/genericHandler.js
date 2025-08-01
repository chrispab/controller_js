
import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';
import { updateStausAndWSBroadcastStatusIfValueChanged } from '../../controlLoop.js';

/**
 * A generic handler for MQTT messages.
 *
 * @param {string} topic - The MQTT topic.
 * @param {Buffer} payload - The message payload.
 * @param {Function} logic - The custom logic to execute.
 * @param {string} publishTopicKey - The MQTT topic key for publishing the state.
 * @param {string} controllerStatusKey - The configuration key for updating the status.
 */
function handleMessage(topic, payload, logic, publishTopicKey, controllerStatusKey) {
  try {
    const value = payload.toString();
    logic(topic, value);
    if (publishTopicKey && controllerStatusKey) {
      utils.logAndPublishState(`${controllerStatusKey}: `, cfg.getWithMQTTPrefix(publishTopicKey), value);
    }
  } catch (error) {
    logger.error(`Error handling MQTT message for topic ${topic}: ${error.message}`, { stack: error.stack });
  }
}

export default handleMessage;
