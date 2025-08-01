import eventEmitter from '../eventEmitter.js';
import { updateStausAndWSBroadcastStatusIfValueChanged } from '../../controlLoop.js';
import * as utils from '../../utils/utils.js';
import cfg from '../config.js';

function registerFanEventHandlers() {
  eventEmitter.on('fan/started', ({ name }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('fan', true);
    utils.logAndPublishState('Event fan/started', cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), 1);
  });

  eventEmitter.on('fan/stopped', ({ name }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('fan', false);
    utils.logAndPublishState('Event fan/stopped', cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), 0);
  });

  eventEmitter.on('fan/on-duration-changed', ({ onMs }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('fanOnDurationSecs', onMs / 1000);
    utils.logAndPublishState('Event fan/on-duration-changed: ', cfg.getWithMQTTPrefix('fan.onMs'), onMs);
  });

  eventEmitter.on('fan/off-duration-changed', ({ offMs }) => {
    updateStausAndWSBroadcastStatusIfValueChanged('fanOffDurationSecs', offMs / 1000);
    utils.logAndPublishState('Event fan/off-duration-changed: ', cfg.getWithMQTTPrefix('fan.offMs'), offMs);
  });
}

export default registerFanEventHandlers;
