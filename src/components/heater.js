import IOBase from "./IOBase.js";
import cfg from "../services/config.js";
import logger from "../services/logger.js";
const logLevel = 'debug';


class Heater {
  constructor(name, heaterPin, mqttAgent) {
    this.IOPin = new IOBase(heaterPin, 'out', 0);
    this.setName(name);
    this.heater_sp_offset = cfg.get("heater.heater_sp_offset");
    this.heatingCycleState = 'INACTIVE';
    this.on("heaterStateChange", this.heaterStateEventHandler);

    this.mqttAgent = mqttAgent;
    this.ExternalTDiffMs = cfg.get("heater.ExternalTDiffMs");
  }

  heaterStateEventHandler = function (state, mqttAgent) {
    logger.log('info', 'MQTT->Heater: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.heaterStateTopic") + ": " + (state ? 1 : 0)}`);
    mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.heaterStateTopic"), `${state ? 1 : 0}`);
  }

  process() {
    this.processCount = this.processCount ? this.processCount + 1 : 1;
  }

  control(currentTemp, setPointTemperature, lightState, outsideTemp =10) {
    // logger.log('warn',`currentTemp:${currentTemp} setPointTemperature:${setPointTemperature} lightState:${lightState}`);
    const currentMillis = Date.now();
    // logger.log('warn', '==Heat ctl==');
    // Calculate new heater on time based on temperature gap
    // this.heatOnMs = ((setPointTemperature - currentTemp) * 20 * 1000) + cfg.getItemValueFromConfig('heatOnMs');
    // logger.log('warning', '==Heat tdelta on:', this.heatOnMs);

    // Check for heater OFF hours // TODO: improve this
    // const currentHour = new Date().getHours();
    // if (cfg.getItemValueFromConfig('heat_off_hours').includes(currentHour)) { // l on and not hh:mm pm
    if (lightState == true) {
      this.turnOff();// = 'OFF';
      return;
      // logger.log('warning', '..d on, in heat off hours - skipping lon heatctl');
    } else { // d off here
      this.heatOffMs = cfg.get('heater.heatOffMs');
      // logger.log('warning', '..light off..do heatctl');
      // logger.log('warning', 'self.heatingCycleState:', this.heatingCycleState);
      if (currentTemp >= (setPointTemperature + this.heater_sp_offset)) {
        if (this.heatingCycleState === 'INACTIVE') {
          this.turnOff();
        }
      }
      // Just trigger a defined ON period - force it to complete
      // Then force a defined OFF period - force it to complete
      // Is an on or off pulse active?
      if (currentTemp < (setPointTemperature + this.heater_sp_offset)) {
        if (this.heatingCycleState === 'INACTIVE') {
          //! Look at on period based on external temp
          // Extra heater time based on difference from set point per 0.1 degree difference
          // let internalDiffT = Math.floor(((setPointTemperature - currentTemp) * 10 * this.InternalTDiffMs));
          // logger.log('warning', '--INTERNAL DIFF extra time to add ms:', internalDiffT);

          // Extra heater time based on external temp difference
          // Do if external diff is >2 deg C
          if (outsideTemp === null) {
            outsideTemp = 10;
          }
          // let externalDiffT = Math.floor((setPointTemperature - 2 - outsideTemp) * this.ExternalTDiffMs);
          // Milliseconds per degree diff
          // let externalDiffT = Math.floor((setPointTemperature - outsideTemp) * this.ExternalTDiffMs);
          let externalDiffT = (setPointTemperature - outsideTemp) * this.ExternalTDiffMs;
          logger.log('warn', `setPointTemperature:${setPointTemperature} outsideTemp:${outsideTemp} externalDiffT:${externalDiffT}`);

          logger.log('error', `--EXTERNAL DIFF tdelta on to add ms:${externalDiffT}` );

          // this.heatOnMs = cfg.getItemValueFromConfig('heatOnMs') + internalDiffT + externalDiffT; // + (outsideTemp / 50);
          this.heatOnMs = cfg.get('heater.heatOnMs') + externalDiffT; // + (outsideTemp / 50);
          this.heatOffMs = cfg.get('heater.heatOffMs');
          logger.log('warn', '>>>>>>> CALCULATED TOTAL delta ON ms:', this.heatOnMs);

          // Start a cycle - ON first
          this.heatingCycleState = 'ON';
          // Init ON state timer
          // this.lastStateChangeMillis = currentMillis;
          this.turnOn();
          logger.log('warn', "..........temp low - currently INACTIVE - TURN HEATing cycle state ON");
        }
      }

      if (this.heatingCycleState === 'ON') {
        if ((currentMillis - this.getPrevStateChangeMs() ) >= this.heatOnMs) {
          this.heatingCycleState = 'OFF';
          this.turnOff
          // this.lastStateChangeMillis = currentMillis;
          logger.log('warn', ".......... - currently ON - TURN HEATing cycle state OFF");
        }
      }

      if (this.heatingCycleState === 'OFF') {
        if ((currentMillis - this.getPrevStateChangeMs()) >= this.heatOffMs) {
          this.heatingCycleState = 'INACTIVE';
          logger.log('warn', ".......... - currently OFF - MAKE HEATing cycle state INACTIVE");
          this.turnOff();
          // this.lastStateChangeMillis = currentMillis;
        }
      }
    }
  }

  turnOn() {
    this.setState(true);
    this.writeIO(1);
    this.emitIfStateChanged();
  }

  turnOff() {
    this.setState(false);
    this.writeIO(0);
    this.emitIfStateChanged();
  }

  getTelemetryData() {
    let telemetry = this.getBaseTelemetryData();
    logger.log('debug', `tele heater: ${JSON.stringify(telemetry)}`); // logger.error(JSON.stringify(superTelemetry));
    return telemetry;
  }

  emitIfStateChanged() {
    if (this.hasNewStateAvailable()) {
      if (this.getStateAndClearNewStateFlag() == true) {
        logger.log(logLevel, "Heater is on");
      } else {
        logger.log(logLevel, "Heater is off");
      }
      this.trigger("heaterStateChange", this.getState(), this.mqttAgent);
    }
  }

}

// https://javascript.info/mixins
import eventMixin from './mixins/eventMixin.js'
// Add the mixin with event-related methods
Object.assign(Heater.prototype, eventMixin);

import IOPinAccessorsMixin from "./mixins/IOPinAccessorsMixin.js";
Object.assign(Heater.prototype, IOPinAccessorsMixin);

export default Heater;