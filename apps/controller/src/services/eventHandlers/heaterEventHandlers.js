import eventEmitter from '../eventEmitter.js';
import { stateManager } from '../../controlLoop.js';

function registerHeaterEventHandlers() {
  eventEmitter.on('heaterStateChanged', ({ state }) => {
    stateManager.update({ heater: state });
  });
}

export default registerHeaterEventHandlers;
