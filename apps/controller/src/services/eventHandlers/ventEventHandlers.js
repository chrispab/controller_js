import eventEmitter from '../eventEmitter.js';
import { stateManager } from '../../controlLoop.js';

function registerVentEventHandlers() {
  eventEmitter.on('ventStateChanged', ({ state }) => {
    stateManager.update({
      ventTotal: state,
      ventPower: state > 0 ? 1 : 0,
      ventSpeed: state === 2 ? 1 : 0,
    });
  });

  eventEmitter.on('ventDurationChanged', ({ period, duration }) => {
    if (period === 'day') {
      // Placeholder for future logic
    }
  });
}

export default registerVentEventHandlers;
