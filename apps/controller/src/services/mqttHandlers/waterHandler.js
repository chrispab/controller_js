import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';
import {
  controllerStatus,
  updateAndBroadcastStatusIfValueChanged,
} from '../controlLoop.js';


export function handleSensorSoilMoistureRaw(recievedTopic, payload) {
  // handleSetpoint(recievedTopic, paylod, 'zone.highSetpoint', 'mqtt.highSetpointTopic');
  controllerStatus.soilMoisturePercent = parseFloat(payload.toString());
}


