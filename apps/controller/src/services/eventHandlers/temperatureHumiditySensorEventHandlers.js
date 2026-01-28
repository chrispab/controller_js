import eventEmitter from '../eventEmitter.js';
import { stateManager } from '../../controlLoop.js';
import * as utils from '../../utils/utils.js';
import cfg from '../config.js';

function registerSensorEventHandlers() {
  eventEmitter.on('temperatureChanged', ({ temperature }) => {
    utils.logAndPublishState('Event temperatureChanged', cfg.getWithMQTTPrefix('mqtt.temperatureStateTopic'), temperature);
    stateManager.update({ temperature });
  });

  eventEmitter.on('humidityChanged', ({ humidity }) => {
    utils.logAndPublishState('Event humidityChanged', cfg.getWithMQTTPrefix('mqtt.humidityStateTopic'), humidity);
    stateManager.update({ humidity });
  });
}

export default registerSensorEventHandlers;
