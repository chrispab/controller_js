import registerFanEventHandlers from './fanEventHandlers.js';
import registerHeaterEventHandlers from './heaterEventHandlers.js';
import registerLightEventHandlers from './lightEventHandlers.js';
import registerSensorEventHandlers from './sensorEventHandlers.js';
import registerVentEventHandlers from './ventEventHandlers.js';

function registerEventHandlers() {
  registerFanEventHandlers();
  registerHeaterEventHandlers();
  registerLightEventHandlers();
  registerSensorEventHandlers();
  registerVentEventHandlers();
}

export default registerEventHandlers;
