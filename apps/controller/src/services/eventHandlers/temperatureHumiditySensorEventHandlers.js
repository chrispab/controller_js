import eventEmitter from '../eventEmitter.js';
import dataStore from '../dataStore.js';

function registerSensorEventHandlers() {
  eventEmitter.on('THSensor/temperature/new-reading', ({ temperature }) => {
    utils.logAndPublishState('Event THSensor/temperature/new-reading', dataStore.getWithMQTTPrefix('config.mqtt.temperatureStateTopic'), temperature);

    dataStore.set('state.temperature', temperature);
  });

  eventEmitter.on('THSensor/humidity/new-reading', ({ humidity }) => {
    utils.logAndPublishState('Event THSensor/humidity/new-reading', dataStore.getWithMQTTPrefix('config.mqtt.humidityStateTopic'), humidity);
    dataStore.set('state.humidity', humidity);
  });
}

export default registerSensorEventHandlers;
