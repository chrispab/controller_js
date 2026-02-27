import IOBase from './IOBase.js';
import logger from '../services/logger.js';
import { Gpio } from 'onoff';
import cfg from '../services/config.js';
import * as utils from '../utils/utils.js';
import eventEmitter from '../services/eventEmitter.js';

const logLevel = 'error'; // Change to 'debug' for more verbose logging

export default class Vent {
  constructor(name, ventPowerPin, ventSpeedPin) {
    this.IOPin = new IOBase(ventPowerPin, 'dummy-virtual-out', 0);
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
    this.outSideTemp = 10;
    // -- Duration Settings --
    this.onDurationMs = 0;
    this.offDurationMs = 0;

    // -- Event Listeners --
    eventEmitter.on('temperatureChanged', ({ temperature }) => {
      this.currentTemp = temperature;
    });

    eventEmitter.on('outsideTemperatureChanged', ({ outsideTemperature }) => {
      this.outSideTemp = outsideTemperature;
    });

    eventEmitter.on('lightStateChanged', ({ lightState }) => {
      this.lightState = lightState;
      // Reset cycle state when light state changes to ensure correct logic is applied immediately
      this.cycleState = 'inactive';
    });

    // Start autonomous operation
    setInterval(() => this.controlCycle(), 1000); // Main control loop runs every second
    this.periodicPublication();
    setInterval(() => this.periodicPublication(), cfg.get('vent.periodicPublishIntervalMs'));
  }

  controlCycle() {
    const setPoint = this.lightState ? cfg.get('zone.highSetpoint') : cfg.get('zone.lowSetpoint');
    const elapsedMs = Date.now() - this.lastStateChangeMs;

    logger.log(
      logLevel,
      `====>>Control Cycle Start - Current Temp: ${this.currentTemp}°C, Setpoint: ${setPoint}°C, Light State: ${this.lightState ? 'ON' : 'OFF'}, Vent Override: ${this.ventOverride}`,
    );
    // --- High-Temperature Override Check ---
    // when day and temp is above highsp activate override and run at 100% if its light
    if (this.lightState && this.currentTemp > setPoint) {
      logger.log(logLevel, `====Current Temp: ${this.currentTemp}°C exceeds high setpoint (${setPoint}°C) during light conditions`);
      if (!this.ventOverride) {
        logger.log(logLevel, '====High-temperature override ACTIVATED');
        this.ventOverride = true;
      }
      this.updateState(2); // Set to 100% speed
      return; // Override takes precedence
    }
    // when dark and temp is above lowsp + deadband activate override and run at 50% to avoid bringing in too much cold air
    if (!this.lightState && this.currentTemp > setPoint + cfg.get('vent.setpointDeadBandSize')) {
      logger.log(logLevel, `====Current Temp: ${this.currentTemp}°C exceeds low setpoint + deadband (${setPoint + cfg.get('vent.setpointDeadBandSize')}°C) during dark conditions`);
      if (!this.ventOverride) {
        logger.log(logLevel, '====High-temperature override ACTIVATED');
        this.ventOverride = true;
      }
      this.updateState(1); // Set to 50% speed
      return; // Override takes precedence
    }

    // // if (this.currentTemp > setPoint + cfg.get('vent.setpointDeadBandSize')) {
    // if (this.currentTemp > setPoint) {
    //   logger.log(logLevel, `====Current Temp: ${this.currentTemp}°C exceeds setpoint + deadband (${setPoint + cfg.get('vent.setpointDeadBandSize')}°C)`);
    //   if (!this.ventOverride) {
    //     logger.log(logLevel, '====High-temperature override ACTIVATED');
    //     this.ventOverride = true;
    //   }
    //   // if its light run at 100% otherwise if its dark and the lowsp diff is lt 5 run at 100% otherwise run at 50% to avoid bringing in too much cold air
    //   if (this.lightState) {
    //     this.updateState(2); // Set to 100% speed
    //   } else {
    //     logger.log(
    //       logLevel,
    //       `====Low setpoint: ${cfg.get('zone.lowSetpoint')}, Outside Temp: ${this.outSideTemp}, Diff: ${cfg.get('zone.lowSetpoint') - this.outSideTemp}, Threshold: ${cfg.get('vent.outsideTempDiffThresholdForMaxSpeed')}`,
    //     );
    //     // if outside temperature and lowsp diff is lt 5 run at 100% otherwise run at 50% to avoid bringing in too much cold air
    //     // if (cfg.get('zone.lowSetpoint') - this.outSideTemp < cfg.get('vent.outsideTempDiffThreshold')) {
    //     if (cfg.get('zone.lowSetpoint') - this.outSideTemp < cfg.get('vent.outsideTempDiffThresholdForMaxSpeed')) {
    //       this.updateState(2); // Set to 100% speed
    //     } else {
    //       this.updateState(1); // Set to 50% speed
    //     }
    //   }
    //   return; // Override takes precedence
    // }

    // --- Deactivate Override ---
    if (this.ventOverride) {
      if (this.currentTemp <= setPoint) {
        if (elapsedMs >= cfg.get('vent.ventOverridePulseOnDelta')) {
          logger.log(logLevel, '====High-temperature override DEACTIVATED');
          this.ventOverride = false;
          this.cycleState = 'inactive'; // Reset cycle
          this.updateState(0); // Turn off
        }
      }
      return; // Wait for override to complete
    }

    // --- Regular Day/Night Cycle Logic ---
    const dayOrNight = this.lightState ? 'day' : 'night';
    this.setOnDurationMs(cfg.get(`vent.onDurationMs.${dayOrNight}`));
    this.setOffDurationMs(cfg.get(`vent.offDurationMs.${dayOrNight}`));

    logger.log(
      logLevel,
      `====Cycle State: ${this.cycleState}, Elapsed Time: ${elapsedMs}ms, On Duration: ${this.getOnDurationMs()}ms, Off Duration: ${this.getOffDurationMs()}ms`,
    );
    switch (this.cycleState) {
      case 'inactive':
        // Start a new cycle
        this.cycleState = 'ON';
        this.updateState(1); // 50% speed
        break;

      case 'ON':
        if (elapsedMs >= this.getOnDurationMs()) {
          this.cycleState = 'OFF';
          this.updateState(0);
        }
        break;

      case 'OFF':
        if (elapsedMs >= this.getOffDurationMs()) {
          this.cycleState = 'ON';
          this.updateState(1); // 50% speed
        }
        break;
    }
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
      eventEmitter.emit('ventStateChanged', {
        name: this.name,
        state: newState,
      });

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

  setOnDurationMs(newOnDurationMs) {
    if (this.onDurationMs !== newOnDurationMs) {
      this.onDurationMs = newOnDurationMs;
      eventEmitter.emit('vent/on-duration-changed', {
        name: this.getName(),
        onMs: newOnDurationMs,
      });
    }
  }

  getOnDurationMs() {
    return this.onDurationMs;
  }

  setOffDurationMs(newOffDurationMs) {
    if (this.offDurationMs !== newOffDurationMs) {
      this.offDurationMs = newOffDurationMs;
      eventEmitter.emit('vent/off-duration-changed', {
        name: this.getName(),
        offMs: newOffDurationMs,
      });
    }
  }

  getOffDurationMs() {
    return this.offDurationMs;
  }

  periodicPublication() {
    const onMsDay = cfg.get('vent.onDurationMs.day');
    const offMsDay = cfg.get('vent.offDurationMs.day');
    const onMsNight = cfg.get('vent.onDurationMs.night');
    const offMsNight = cfg.get('vent.offDurationMs.night');

    utils.logAndPublishState('Vent P', cfg.getWithMQTTPrefix('mqtt.ventOnDurationDaySecsTopic'), onMsDay / 1000);
    utils.logAndPublishState('Vent P', cfg.getWithMQTTPrefix('mqtt.ventOffDurationDaySecsTopic'), offMsDay / 1000);
    utils.logAndPublishState('Vent P', cfg.getWithMQTTPrefix('mqtt.ventOnDurationNightSecsTopic'), onMsNight / 1000);
    utils.logAndPublishState('Vent P', cfg.getWithMQTTPrefix('mqtt.ventOffDurationNightSecsTopic'), offMsNight / 1000);
  }
}
// add IOPinAccessorsMixin
import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(Vent.prototype, IOPinAccessorsMixin);
