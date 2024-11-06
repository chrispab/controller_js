import logger from "../src/services/logger.js";
// const logLevel = 'debug';
import mqttAgent from "../src/services/mqttAgent.js";

let logAndPublishStateMixin = {
    logAndPublishState2(topic, state, client) {
        var logLevel = "info";
        logger.log(logLevel, "MQTT->" + this.getName() + `:${topic + ": " + state}`);
        client.publish(topic, `${state}`);
    }
};

export default logAndPublishStateMixin;