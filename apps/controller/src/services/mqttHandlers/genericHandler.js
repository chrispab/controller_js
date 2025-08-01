
import logger from '../logger.js';
import { updateStausAndWSBroadcastStatusIfValueChanged } from '../../controlLoop.js';

/**
 * A generic handler for MQTT messages.
 *
 * @param {string} topic - The MQTT topic.
 * @param {Buffer} payload - The message payload.
 * @param {Function} logic - The custom logic to execute.
 */
function handleMessage(topic, payload, logic) {
  try {
    const value = payload.toString();
    logic(topic, value);
  } catch (error) {
    logger.error(`Error handling MQTT message for topic ${topic}: ${error.message}`, { stack: error.stack });
  }
}

export default handleMessage;
