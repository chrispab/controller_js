import IOBase from './IOBase.js';
import logger from '../services/logger.js';
import { Gpio } from 'onoff';
import cfg from '../services/config.js';
import * as utils from '../utils/utils.js';
import eventEmitter from '../services/eventEmitter.js';

const logLevel = 'debug';

export default class Vent {
  constructor(name, ventPowerPin, ventSpeedPin) {
    this.IOPin = new IOBase(ventPowerPin, 'dummy vent', 0);
    this.setState(false); //0, 1 or 2. 0%, 50%, 100%. off,medium,full
    this.setName(name);
    // two Pins, on/off and speed 50-100%
    this.ventPowerPin = new IOBase(ventPowerPin, 'out', 0);
    this.ventPowerPin.setState(false);
    this.ventSpeedPin = new IOBase(ventSpeedPin, 'out', 0);
    this.ventSpeedPin.setState(false);
    this.lastStateChangeMs = 0;
    this.ventOverride = false;
    this.cycleState = 'inactive'; // inactive, ON, OFF

    // -- Current environmental state --
    this.currentTemp = 20;
    this.lightState = false;

    // -- Event Listeners --
    eventEmitter.on('temperatureChanged', ({ temperature }) => {
      this.currentTemp = temperature;
    });
    eventEmitter.on('lightStateChanged', ({ lightState }) => {
      this.lightState = lightState;
      // Reset cycle state when light state changes to ensure correct logic is applied immediately
      this.cycleState = 'inactive';
    });

    // Start autonomous operation
    setInterval(() => this.controlCycle(), 1000); // Main control loop runs every second
    setInterval(() => this.periodicPublication(), cfg.get('vent.periodicPublishIntervalMs'));
  }



  updateState(newState) {
    const oldState = this.getState();
    if (newState !== oldState) {
      this.setState(newState);
      this.lastStateChangeMs = Date.now();

      const power = newState > 0 ? 1 : 0;
      const speed = newState === 2 ? 1 : 0;

      this.ventPowerPin.writeIO(power);
      this.ventSpeedPin.writeIO(speed);

      logger.log(logLevel, `${this.getName()} state changed to ${newState} (Power: ${power}, Speed: ${speed})`);
      eventEmitter.emit('ventStateChanged', { name: this.name, state: newState });

      // MQTT Publications
      utils.logAndPublishState('Vent power update', cfg.getWithMQTTPrefix('mqtt.ventStateTopic'), power);
      utils.logAndPublishState('Vent speed update', cfg.getWithMQTTPrefix('mqtt.ventSpeedStateTopic'), speed);
      utils.logAndPublishState('Vent value update', cfg.getWithMQTTPrefix('mqtt.ventValueTopic'), newState);
      utils.logAndPublishState('Vent power percent update', cfg.getWithMQTTPrefix('mqtt.ventSpeedPercentTopic'), this.getSpeedPercent());
    }
  }

  getSpeedPercent() {
      if (this.getState() === 2) return 100;
      if (this.getState() === 1) return 50;
      return 0;
  }

  controlCycle() {
    const setPoint = this.lightState ? cfg.get('zone.highSetpoint') : cfg.get('zone.lowSetpoint');
    const elapsedMs = Date.now() - this.lastStateChangeMs;

    // --- High-Temperature Override Check ---
    if (this.currentTemp > setPoint + cfg.get('vent.lightOnSetpointOffset')) {
      if (!this.ventOverride) {
        logger.debug('High-temperature override ACTIVATED');
        this.ventOverride = true;
      }
      this.updateState(2); // Set to 100% speed
      return; // Override takes precedence
    }

    // --- Deactivate Override ---
    if (this.ventOverride) {
        if (this.currentTemp <= setPoint) {
            if (elapsedMs >= cfg.get('vent.ventOverridePulseOnDelta')) {
                logger.debug('High-temperature override DEACTIVATED');
                this.ventOverride = false;
                this.cycleState = 'inactive'; // Reset cycle
                this.updateState(0); // Turn off
            }
        } 
        return; // Wait for override to complete
    }

    // --- Regular Day/Night Cycle Logic ---
    const onMs = this.lightState ? cfg.get('vent.onMs') : cfg.get('vent.ventOnDarkMs');
    const offMs = this.lightState ? cfg.get('vent.offMs') : cfg.get('vent.ventOffDarkMs');

    switch (this.cycleState) {
      case 'inactive':
        // Start a new cycle
        this.cycleState = 'ON';
        this.updateState(1); // 50% speed
        break;

      case 'ON':
        if (elapsedMs >= onMs) {
          this.cycleState = 'OFF';
          this.updateState(0);
        }
        break;

      case 'OFF':
        if (elapsedMs >= offMs) {
          this.cycleState = 'ON';
          this.updateState(1); // 50% speed
        }
        break;
    }
  }

  periodicPublication() {
    const onMs = cfg.get('vent.onMs');
    const offMs = cfg.get('vent.offMs');
    const onDarkMs = cfg.get('vent.ventOnDarkMs');
    const offDarkMs = cfg.get('vent.ventOffDarkMs');

    utils.logAndPublishState('Vent P', cfg.getWithMQTTPrefix('mqtt.ventOnDeltaSecsTopic'), onMs / 1000);
    utils.logAndPublishState('Vent P', cfg.getWithMQTTPrefix('mqtt.ventOffDeltaSecsTopic'), offMs / 1000);
    utils.logAndPublishState('Vent P', cfg.getWithMQTTPrefix('mqtt.ventOnDarkSecsTopic'), onDarkMs / 1000);
    utils.logAndPublishState('Vent P', cfg.getWithMQTTPrefix('mqtt.ventOffDarkSecsTopic'), offDarkMs / 1000);
  }
}
// add IOPinAccessorsMixin
import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Vent.prototype, IOPinAccessorsMixin);