import eventEmitter from '../eventEmitter.js';
import { updateStausAndWSBroadcastStatusIfValueChanged } from '../../controlLoop.js';
import cfg from '../config.js';
import mqttAgent from '../mqttAgent.js';

function registerLightEventHandlers() {
  eventEmitter.on('lightStateChanged', ({ lightState }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('light', lightState);
    // Update setpoint when light state changes
    const newSetpoint = lightState ? cfg.get('zone.highSetpoint') : cfg.get('zone.lowSetpoint');
    updateStausAndWSBroadcastStatusIfValueChanged('setpoint', newSetpoint);
    mqttAgent.setactiveSetpoint(newSetpoint);
  });
}

export default registerLightEventHandlers;
