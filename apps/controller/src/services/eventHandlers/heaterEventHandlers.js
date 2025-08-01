import eventEmitter from '../eventEmitter.js';
import { updateStausAndWSBroadcastStatusIfValueChanged } from '../../controlLoop.js';

function registerHeaterEventHandlers() {
  eventEmitter.on('heaterStateChanged', ({ state }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('heater', state);
  });
}

export default registerHeaterEventHandlers;
