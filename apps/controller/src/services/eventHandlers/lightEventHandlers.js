import eventEmitter from '../eventEmitter.js';
import { stateManager } from '../../controlLoop.js';
import cfg from '../config.js';
import mqttAgent from '../mqttAgent.js';

function registerLightEventHandlers() {
  eventEmitter.on('lightStateChanged', ({ lightState }) => {
    const newSetpoint = lightState ? cfg.get('zone.highSetpoint') : cfg.get('zone.lowSetpoint');
    stateManager.update({ light: lightState ? 1 : 0, setpoint: newSetpoint });
    mqttAgent.setactiveSetpoint(newSetpoint);
  });
}

export default registerLightEventHandlers;
