import eventEmitter from '../eventEmitter.js';
import { stateManager } from '../../controlLoop.js';
import * as utils from '../../utils/utils.js';
import cfg from '../config.js';

function registerFanEventHandlers() {
  eventEmitter.on('fan/started', ({ name }) => {
    stateManager.update({ fan: 1 });
    utils.logAndPublishState('Event fan/started', cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), 1);
  });

  eventEmitter.on('fan/stopped', ({ name }) => {
    stateManager.update({ fan: 0 });
    utils.logAndPublishState('Event fan/stopped', cfg.getWithMQTTPrefix('mqtt.fanStateTopic'), 0);
  });

  eventEmitter.on('fan/on-duration-changed', ({ onMs }) => {
    stateManager.update({ fanOnDurationSecs: onMs / 1000 });
    utils.logAndPublishState('Event fan/on-duration-changed: ', cfg.getWithMQTTPrefix('fan.onMs'), onMs);
  });

  eventEmitter.on('fan/off-duration-changed', ({ offMs }) => {
    stateManager.update({ fanOffDurationSecs: offMs / 1000 });
    utils.logAndPublishState('Event fan/off-duration-changed: ', cfg.getWithMQTTPrefix('fan.offMs'), offMs);
  });
}

export default registerFanEventHandlers;
