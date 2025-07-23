import IOBase from '../components/IOBase.js';
import os from 'os';
import sensor from 'node-dht-sensor';
import logger from '../services/logger.js';
import cfg from '../services/config.js';
import * as utils from '../utils/utils.js';
import eventEmitter from '../services/eventEmitter.js';

const logLevel = 'debug';

export default class TemperatureSensor {
  constructor(name, dhtSensorPin) {
    this.powerPin = new IOBase(cfg.get('hardware.powerPin.pin'), 'out', 1);
    this.IOPin = new IOBase(dhtSensorPin, 'in', 0);
    this.setName(name);
    this.dhtSensorType = cfg.get('hardware.dhtSensor.type');
    this.dhtSensorPin = dhtSensorPin;
    this.temperature = null;
    this.humidity = null;
    this.sensorReadIntervalMs = cfg.get('temperatureSensor.sensorReadIntervalMs');
    this.periodicPublishIntervalMs = cfg.get('temperatureSensor.periodicPublishIntervalMs');

    logger.info(`HostName: ${os.hostname()}`);
    if (os.hostname() !== 'zone3' && os.hostname() !== 'zone1') {
      sensor.initialize({ test: { fake: { temperature: 21, humidity: 60 } } });
    }

    // Start autonomous operation
    this.readSensor(); // Initial read
    setInterval(() => this.readSensor(), this.sensorReadIntervalMs);
    setInterval(() => this.periodicPublication(), this.periodicPublishIntervalMs);
  }

  setName(name) {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  periodicPublication() {
    if (this.getTemperature() !== null) {
      utils.logAndPublishState('Temperature Sensor P', cfg.getWithMQTTPrefix('mqtt.temperatureStateTopic'), `${this.getTemperature()}`);
    }
    if (this.getHumidity() !== null) {
      utils.logAndPublishState('Temperature Sensor P', cfg.getWithMQTTPrefix('mqtt.humidityStateTopic'), `${this.getHumidity()}`);
    }
  }

  readSensor() {
    try {
      sensor.read(this.dhtSensorType, this.dhtSensorPin, (err, temperature, humidity) => {
        if (!err) {
          const newTemp = parseFloat(temperature.toFixed(1));
          const newHum = parseFloat(humidity.toFixed(1));

          if (newTemp !== this.getTemperature()) {
            const oldTemp = this.getTemperature();
            this.setTemperature(newTemp);
            logger.debug(`Temperature changed from ${oldTemp}°C to ${newTemp}°C`);
            eventEmitter.emit('temperatureChanged', { temperature: newTemp });
            utils.logAndPublishState('Temp Sensor', cfg.getWithMQTTPrefix('mqtt.temperatureStateTopic'), newTemp);
          }

          if (newHum !== this.getHumidity()) {
            const oldHum = this.getHumidity();
            this.setHumidity(newHum);
            logger.debug(`Humidity changed from ${oldHum}% to ${newHum}%`);
            eventEmitter.emit('humidityChanged', { humidity: newHum });
            utils.logAndPublishState('Temp Sensor', cfg.getWithMQTTPrefix('mqtt.humidityStateTopic'), newHum);
          }
        } else {
          logger.error('Failed to read from DHT sensor: ' + err);
        }
      });
    } catch (error) {
      logger.error(`Error in readSensor: ${error}`);
    }
  }

  setTemperature(temperature) {
    this.temperature = temperature;
  }

  getTemperature() {
    return this.temperature;
  }

  getHumidity() {
    return this.humidity;
  }

  setHumidity(humidity) {
    this.humidity = humidity;
  }

  getSensorStr() {
    return `temperature: ${this.getTemperature()}°C, humidity: ${this.getHumidity()}%`;
  }
}
import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
Object.assign(TemperatureSensor.prototype, IOPinAccessorsMixin);