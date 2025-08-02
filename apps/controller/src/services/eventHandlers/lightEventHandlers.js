import eventEmitter from '../eventEmitter.js';
import dataStore from '../dataStore.js';
import mqttAgent from '../mqttAgent.js';

function registerLightEventHandlers() {
  eventEmitter.on('lightStateChanged', ({ lightState }) => {
    const newSetpoint = lightState ? dataStore.get('config.zone.highSetpoint') : dataStore.get('config.zone.lowSetpoint');
    dataStore.set('state.light', lightState);
    dataStore.set('state.setpoint', newSetpoint);
    mqttAgent.setactiveSetpoint(newSetpoint);
  });
}

export default registerLightEventHandlers;
