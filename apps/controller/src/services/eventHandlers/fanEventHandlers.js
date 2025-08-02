import eventEmitter from '../eventEmitter.js';
import dataStore from '../dataStore.js';

function registerFanEventHandlers() {
  eventEmitter.on('fan/started', ({ name }) => {
    dataStore.set('state.fan', true);
    utils.logAndPublishState('Event fan/started', dataStore.getWithMQTTPrefix('config.mqtt.fanStateTopic'), 1);
  });

  eventEmitter.on('fan/stopped', ({ name }) => {
    dataStore.set('state.fan', false);
    utils.logAndPublishState('Event fan/stopped', dataStore.getWithMQTTPrefix('config.mqtt.fanStateTopic'), 0);
  });

  eventEmitter.on('fan/on-duration-changed', ({ onMs }) => {
    dataStore.set('state.fanOnDurationSecs', onMs / 1000);
    utils.logAndPublishState('Event fan/on-duration-changed: ', dataStore.getWithMQTTPrefix('config.fan.onMs'), onMs);
  });

  eventEmitter.on('fan/off-duration-changed', ({ offMs }) => {
    dataStore.set('state.fanOffDurationSecs', offMs / 1000);
    utils.logAndPublishState('Event fan/off-duration-changed: ', dataStore.getWithMQTTPrefix('config.fan.offMs'), offMs);
  });
}

export default registerFanEventHandlers;
