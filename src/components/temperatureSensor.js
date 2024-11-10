import IOBase from '../components/IOBase.js';
import os from 'os';
import sensor from 'node-dht-sensor';
import logger from '../services/logger.js';
// import cfg from "config";
import cfg from '../services/config.js';
import * as utils from '../utils/utils.js';
// import mqttAgent from "../services/mqttAgent.js";

export default class TemperatureSensor {
  constructor(name, dhtSensorPin) {
    this.IOPin = new IOBase(dhtSensorPin, 'in', 0);
    this.setName(name);
    this.dhtSensorType = cfg.get('hardware.dhtSensor.type');
    this.dhtSensorPin = dhtSensorPin;
    this.temperature = null;
    this.humidity = null;
    this.sensorReadIntervalMs = cfg.get('temperatureSensor.sensorReadIntervalMs');
    this.lastSensorReadTimeMs = Date.now() - this.sensorReadIntervalMs;
    this.processCount = 0;
    this.readSensor(); //force an initial sensor read
    this.publishStateIntervalMs = cfg.get('temperatureSensor.publishStateIntervalMs');
    this.lastStatePublishedMs = Date.now() - this.publishStateIntervalMs;
    this.on('temperatureStateChange', this.temperatureStateChangeHandler);

    logger.info(`HostName: ${os.hostname()}`);
    if (os.hostname() !== 'zone3' && os.hostname() !== 'zone1') {
      sensor.initialize({ test: { fake: { temperature: 21, humidity: 60 } } });
    }
  }

  temperatureStateChangeHandler = function (evt) {
    let topic = null;
    if (evt.name === 'temperature') {
      topic = cfg.get('mqtt.temperatureStateTopic');
    } else if (evt.name === 'humidity') {
      topic = cfg.get('mqtt.humidityStateTopic');
    }
    utils.logAndPublishState(evt.description, cfg.get('mqtt.topicPrefix') + topic, evt.state);
    // utils.logAndPublishState(evt.description,  cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.humidityStateTopic"), (evt.state));
  };

  process() {
    // this.processCount = this.processCount ? this.processCount + 1 : 1;
    // ensure regular state publishing, at least every publishStateIntervalMs
    if (Date.now() >= this.lastStatePublishedMs + this.publishStateIntervalMs) {
      this.lastStatePublishedMs = Date.now();
      let evt = { name: 'temperature', state: this.getTemperature(), description: 'temp periodic' };
      this.trigger('temperatureStateChange', evt);

      evt = { name: 'humidity', state: this.getHumidity(), description: 'humi periodic' };
      this.trigger('temperatureStateChange', evt);
    }

    // do an actual read of the sensor every sensorReadIntervalMs
    if (Date.now() >= this.lastSensorReadTimeMs + this.sensorReadIntervalMs) {
      this.readSensor();
      this.lastSensorReadTimeMs = Date.now();
      if (this.hasNewStateAvailable() && this.getTemperature() !== null) {
        //get value from readSensor()
        // Logger.info(`${this.processCount}->NEW temperature: ${this.getSensorStr()}`);
        this.lastStatePublishedMs = Date.now();
        let evt = { name: 'temperature', state: this.getTemperature(), description: 'temp read' };

        this.trigger('temperatureStateChange', evt);
        this.setNewStateAvailable(false);
      }
    }
  }

  getTelemetryData() {
    let superTelemetry = this.getTelemetryData();
    logger.log('debug', `tele temp: ${JSON.stringify(superTelemetry)}`); // logger.error(JSON.stringify(superTelemetry));
    return superTelemetry;
  }

  readSensor() {
    var self = this;
    // logger.info("Trying to Read from DHT sensor...");
    sensor.read(this.dhtSensorType, this.dhtSensorPin, function (err, temperature, humidity) {
      let sensorData = { temperature: 0, humidity: 0 };
      if (!err) {
        //limit to 1 dp
        temperature = temperature.toFixed(1);
        humidity = humidity.toFixed(1);
        // if new temp, save it
        if (temperature !== self.getTemperature()) {
          self.setNewStateAvailable(true);
          //stored values are to 1 decimal
          self.setTemperature(temperature);
          self.setHumidity(humidity);
        }

        sensorData.temperature = self.getTemperature();
        sensorData.humidity = self.getHumidity();

        // console.log(`READ from DHT sensor: temperature${self.getSensorStr()}`);
        return sensorData;
      } else {
        logger.error('Failed to read from DHT sensor: ' + err);
      }
    });
  }

  // create setters
  setTemperature(temperature) {
    this.temperature = temperature;
    this.state = temperature;
  }

  setHumidity(humidity) {
    this.humidity = humidity;
  }
  getTemperature() {
    return this.temperature;
  }

  getHumidity() {
    return this.humidity;
  }

  getSensorStr() {
    return `temp: ${this.getTemperature()}°C, ` + `humidity: ${this.getHumidity()}%`;
  }
}

// https://javascript.info/mixins
import eventMixin from './mixins/eventMixin.js';
// Add the mixin with event-related methods
Object.assign(TemperatureSensor.prototype, eventMixin);

import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(TemperatureSensor.prototype, IOPinAccessorsMixin);
