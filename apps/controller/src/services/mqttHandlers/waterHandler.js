import logger from '../logger.js';
import cfg from '../config.js';
import * as utils from '../../utils/utils.js';
import { controllerStatus, updateAndBroadcastStatusIfValueChanged } from '../../controlLoop.js';

export function handleSensorSoilMoistureRaw(recievedTopic, payload) {
  controllerStatus.SensorSoilMoistureRaw = parseFloat(payload.toString());
  logger.warn(`ZZZZZZZZZZZZZZZZZZZZZZ controllerStatus.SensorSoilMoistureRaw soil1/sensor_method5_batch_moving_average_float: ${controllerStatus.SensorSoilMoistureRaw}`);
}
export function handleSoilMoisturePercent(recievedTopic, payload) {
  controllerStatus.soilMoisturePercent = parseFloat(payload.toString());
  logger.warn(`QQQQQQQQQQQQQQQQQQQQQQQQQQq openhab controllerStatus.soilMoisturePercent: ${controllerStatus.soilMoisturePercent}`);
}

export function handleIrrigationPumpState(recievedTopic, payload) {
  //! TODO this is a dummy value for now upon recieving irrigation pump state
  //pump not yet implenmented
  controllerStatus.irrigationPump = payload.toString() === 'ON';
  logger.info(`XXX Irrigation Pump: ${controllerStatus.irrigationPump}`);
}
