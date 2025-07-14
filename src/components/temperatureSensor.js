import IOBase from '../components/IOBase.js';
import os from 'os';
import sensor from 'node-dht-sensor';
import logger from '../services/logger.js';
import cfg from '../services/config.js';
import * as utils from '../utils/utils.js';

const logLevel = 'debug';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default class TemperatureSensor {
  constructor(name, dhtSensorPin, mqttAgent) {
    this.mqttAgent = mqttAgent;
    this.powerPin = new IOBase(cfg.get('hardware.powerPin.pin'), 'out', 1);
    this.IOPin = new IOBase(dhtSensorPin, 'in', 0);
    this.setName(name);
    this.dhtSensorType = cfg.get('hardware.dhtSensor.type');
    this.dhtSensorPin = dhtSensorPin;
    this.temperature = null;
    this.humidity = null;
    this.sensorReadIntervalMs = cfg.get('temperatureSensor.sensorReadIntervalMs');
    this.lastSensorReadTimeMs = Date.now() - this.sensorReadIntervalMs;
    this.processCount = 0;
    this.periodicPublishIntervalMs = cfg.get('temperatureSensor.periodicPublishIntervalMs');
    this.lastPeriodicPublishedMs = Date.now() - this.periodicPublishIntervalMs;
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
    utils.logAndPublishState(this.mqttAgent, evt.description, cfg.get('mqtt.topicPrefix') + topic, evt.state);
  };

  periodicPublication() {
    if (Date.now() >= this.lastPeriodicPublishedMs + this.periodicPublishIntervalMs) {
      this.lastPeriodicPublishedMs = Date.now();
      utils.logAndPublishState(this.mqttAgent, 'Temperature Sensor P', cfg.getWithMQTTPrefix('mqtt.temperatureStateTopic'), `${this.getTemperature()}`);
      utils.logAndPublishState(this.mqttAgent, 'Temperature Sensor P', cfg.getWithMQTTPrefix('mqtt.humidityStateTopic'), `${this.getHumidity()}`);
    }
  }

  process() {
    this.periodicPublication();

    if (Date.now() >= this.lastSensorReadTimeMs + this.sensorReadIntervalMs) {
      logger.log(logLevel, '0 pre READING Temperature SENSOR STATE: ' + this.getState());

      this.readSensor();

      this.lastSensorReadTimeMs = Date.now();
      wait(1000)
        .then(() => {
          if (this.hasNewStateAvailable()) {
            this.lastStatePublishedMs = Date.now();

            let evt = { name: 'temperature', state: this.getTemperature(), description: 'temperature read' };
            this.trigger('temperatureStateChange', evt);
            this.setNewStateAvailable(false);
          }

          logger.log(logLevel, '4 500ms after READING Temperature SENSOR STATE: ' + this.getState());
        })
        .catch(console.error);
    }
    this.periodicPublication();
  }

  getTelemetryData() {
    let superTelemetry = this.getTelemetryData();
    logger.log(logLevel, `tele temperature: ${JSON.stringify(superTelemetry)}`);
    return superTelemetry;
  }

  readSensor() {
    logger.log(logLevel, '1 pre READING Temperature SENSOR STATE: ' + this.getState());

    var self = this;
    sensor.read(this.dhtSensorType, this.dhtSensorPin, function (err, temperature, humidity) {
      if (!err) {
        temperature = temperature.toFixed(1);
        humidity = humidity.toFixed(1);
        self.setTemperature(temperature);
        self.setHumidity(humidity);

        logger.log(logLevel, '2 in callback read from DHT sensor: ' + self.getState());
      } else {
        logger.error('Failed to read from DHT sensor: ' + err);
      }
    });
  }

  setTemperature(temperature) {
    this.setState(temperature);
  }

  getTemperature() {
    return this.getState();
  }

  getHumidity() {
    return this.humidity;
  }
  setHumidity(humidity) {
    this.humidity = humidity;
  }
  getSensorStr() {
    return `temperature: ${this.getTemperature()}°C, ` + `humidity: ${this.getHumidity()}%`;
  }
}

import eventMixin from './mixins/eventMixin.js';
Object.assign(TemperatureSensor.prototype, eventMixin);

import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(TemperatureSensor.prototype, IOPinAccessorsMixin);