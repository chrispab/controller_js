
import logger from '../logger.js';

/**
 * A generic parser for MQTT messages.
 * It extracts the value from the payload and calls the provided logic.
 *
 * @param {string} topic - The MQTT topic.
 * @param {Buffer} payload - The message payload.
 * @param {Function} logic - The custom logic to execute with the parsed value.
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
