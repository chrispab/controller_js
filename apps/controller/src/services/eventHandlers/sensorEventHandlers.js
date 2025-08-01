import eventEmitter from '../eventEmitter.js';
import { stateManager } from '../../controlLoop.js';

function registerSensorEventHandlers() {
  eventEmitter.on('temperatureChanged', ({ temperature }) => {
    stateManager.update({ temperature });
  });

  eventEmitter.on('humidityChanged', ({ humidity }) => {
    stateManager.update({ humidity });
  });
}

export default registerSensorEventHandlers;
