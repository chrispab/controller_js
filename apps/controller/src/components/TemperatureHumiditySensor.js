import IOBase from './IOBase.js';
import os from 'os';
import sensor from 'node-dht-sensor';
import logger from '../services/logger.js';
import cfg from '../services/config.js';
import * as utils from '../utils/utils.js';
import eventEmitter from '../services/eventEmitter.js';

const logLevel = 'debug';

export default class TemperatureHumiditySensor {
  constructor(name, dhtSensorPin) {
    this.dhtSensorType = cfg.get('hardware.dhtSensor.type');
    this.dhtSensorPin = dhtSensorPin;

    this.powerPin = new IOBase(cfg.get('hardware.powerPin.pin'), 'out', 1);
    // this.IOPin = new IOBase(dhtSensorPin, 'in', 0);
    this.setName(name);

    this.temperature = null;
    this.humidity = null;
    this.isReading = false;
    this.sensorReadIntervalMs = cfg.get('temperatureSensor.sensorReadIntervalMs');
    this.periodicPublishIntervalMs = cfg.get('temperatureSensor.periodicPublishIntervalMs');

    logger.info(`HostName: ${os.hostname()}`);
    if (os.hostname() !== 'zone3' && os.hostname() !== 'zone1') {
      sensor.initialize({ test: { fake: { temperature: 21, humidity: 60 } } });
    }

    // Start autonomous operation
    // Delay initial read to allow the sensor to stabilize after power-on.
    // The DHT22 datasheet recommends at least 2 seconds between reads.
    // setTimeout(() => this.readSensor(), 2000);
    // setInterval(() => this.readSensor(), this.sensorReadIntervalMs);
    // setInterval(() => this.periodicPublication(), this.periodicPublishIntervalMs);
        setTimeout(() => {
      this.readSensor();
      setInterval(() => this.readSensor(), this.sensorReadIntervalMs);
    }, 12000);
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
    if (this.isReading) {
      logger.warn('DHT sensor read already in progress. Skipping this cycle.');
      return;
    }
    this.isReading = true;

    try {
      sensor.read(this.dhtSensorType, this.dhtSensorPin, (err, temperature, humidity) => {
        this.isReading = false; // Reset the flag once the read is complete
        if (!err) {
          const newTemp = parseFloat(temperature.toFixed(1));
          const newHum = parseFloat(humidity.toFixed(1));

          if (newTemp !== this.getTemperature()) {
            const oldTemp = this.getTemperature();
            this.setTemperature(newTemp);
            logger.debug(`Temperature changed from ${oldTemp}°C to ${newTemp}°C`);
            eventEmitter.emit('temperatureChanged', { temperature: newTemp });
            // utils.logAndPublishState('Temp Sensor', cfg.getWithMQTTPrefix('mqtt.temperatureStateTopic'), newTemp);
          }

          if (newHum !== this.getHumidity()) {
            const oldHum = this.getHumidity();
            this.setHumidity(newHum);
            logger.debug(`Humidity changed from ${oldHum}% to ${newHum}%`);
            eventEmitter.emit('humidityChanged', { humidity: newHum });
            // utils.logAndPublishState('Temp Sensor', cfg.getWithMQTTPrefix('mqtt.humidityStateTopic'), newHum);
          }
        } else {
          logger.error('Failed to read from DHT sensor: ' + err);
        }
      });
    } catch (error) {
      this.isReading = false; // Ensure flag is reset on synchronous error too
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

  getTelemetryData() {
    return {
      [this.getName()]: {
        temperature: this.getTemperature(),
        humidity: this.getHumidity(),
        time: Date.now(),
      },
    };
  }
}
// import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';
// Object.assign(TemperatureHumiditySensor.prototype, IOPinAccessorsMixin);
