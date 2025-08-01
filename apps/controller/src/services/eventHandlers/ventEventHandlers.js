import eventEmitter from '../eventEmitter.js';
import { updateStausAndWSBroadcastStatusIfValueChanged } from '../../controlLoop.js';

function registerVentEventHandlers() {
  eventEmitter.on('ventStateChanged', ({ state }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('ventTotal', state);
    updateStausAndWSBroadcastStatusIfValueChanged('ventPower', state > 0 ? 1 : 0);
    updateStausAndWSBroadcastStatusIfValueChanged('ventSpeed', state === 2 ? 1 : 0);
  });

  eventEmitter.on('ventDurationChanged', ({ period, duration }) => {
    if (period === 'day') {
    }
  });
}

export default registerVentEventHandlers;
