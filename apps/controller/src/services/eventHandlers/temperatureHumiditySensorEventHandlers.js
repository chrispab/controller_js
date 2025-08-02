import eventEmitter from '../eventEmitter.js';
import { stateManager } from '../../controlLoop.js';
import * as utils from '../../utils/utils.js';
import cfg from '../config.js';

function registerSensorEventHandlers() {
  eventEmitter.on('THSensor/temperature/new-reading', ({ temperature }) => {
    utils.logAndPublishState('Event THSensor/temperature/new-reading', cfg.getWithMQTTPrefix('mqtt.temperatureStateTopic'), temperature);

    stateManager.update({ temperature });
  });

  eventEmitter.on('THSensor/humidity/new-reading', ({ humidity }) => {
    utils.logAndPublishState('Event THSensor/humidity/new-reading', cfg.getWithMQTTPrefix('mqtt.humidityStateTopic'), humidity);
    stateManager.update({ humidity });
  });
}

export default registerSensorEventHandlers;
