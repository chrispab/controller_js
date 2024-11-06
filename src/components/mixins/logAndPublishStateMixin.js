// import { Gpio } from 'onoff';
import logger from "../../services/logger.js";
// const logLevel = 'debug';
import mqttAgent from "../../services/mqttAgent.js";

let logAndPublishStateMixin = {
    /**
     * Publishes the state to the MQTT broker and logs the action.
     * @param {string} topic - the MQTT topic to publish to
     * @param {number} state - the value to publish
     */
    logAndPublishState(topic, state, client = null) {
        var logLevel = "info";
        logger.log(logLevel, "MQ->" + this.getName() + `:${topic + ": " + state}`);
        if (!client) {
            mqttAgent.client.publish(topic, `${state}`);
        } else {
            client.publish(topic, `${state}`);
        }
    },
    logAndPublishState2(topic, state, client) {
        var logLevel = "info";
        logger.log(logLevel, "MQTT->" + this.getName() + `:${topic + ": " + state}`);
        client.publish(topic, `${state}`);
    },

};

export default logAndPublishStateMixin;