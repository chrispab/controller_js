import eventEmitter from '../eventEmitter.js';
import { updateStausAndWSBroadcastStatusIfValueChanged } from '../../controlLoop.js';

function registerSensorEventHandlers() {
  eventEmitter.on('temperatureChanged', ({ temperature }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('temperature', temperature);
  });

  eventEmitter.on('humidityChanged', ({ humidity }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('humidity', humidity);
  });
}

export default registerSensorEventHandlers;
