import IOBase from '../components/IOBase.js';
import os from 'os';
import sensor from 'node-dht-sensor';
import logger from '../services/logger.js';
import cfg from '../services/config.js';
import eventEmitter from '../services/eventEmitter.js';
import IOPinAccessorsMixin from './mixins/IOPinAccessorsMixin.js';

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
    
    // Initialize sensor for testing if not on target hardware
    if (os.hostname() !== 'zone3' && os.hostname() !== 'zone1') {
      sensor.initialize({ test: { fake: { temperature: 21, humidity: 60 } } });
    }

    // Start periodic reading
    setInterval(() => this.readSensor(), this.sensorReadIntervalMs);
    this.readSensor(); // Initial read
  }

  readSensor() {
    try {
      sensor.read(this.dhtSensorType, this.dhtSensorPin, (err, temperature, humidity) => {
        if (!err) {
          const newTemp = parseFloat(temperature.toFixed(1));
          const newHumidity = parseFloat(humidity.toFixed(1));

          if (newTemp !== this.getTemperature()) {
            this.setTemperature(newTemp);
            logger.log(logLevel, `New temperature: ${this.getTemperature()}°C`);
            eventEmitter.emit('temperatureChanged', this.getTemperature());
          }

          if (newHumidity !== this.getHumidity()) {
            this.setHumidity(newHumidity);
            logger.log(logLevel, `New humidity: ${this.getHumidity()}%`);
            eventEmitter.emit('humidityChanged', this.getHumidity());
          }
        } else {
          logger.error('Failed to read from DHT sensor: ' + err);
        }
      });
    } catch (error) {
      logger.error(`Error in readSensor: ${error}`);
    }
  }

  // The process method is no longer needed in the same way, 
  // as reading is handled by setInterval in the constructor.
  // Kept for compatibility if other parts of the system call it.
  process() {
    // This can be left empty or used for other periodic tasks if needed.
  }

  // create setters
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
    return `temperature: ${this.getTemperature()}°C, humidity: ${this.getHumidity()}%`;
  }
}

// Add the mixin with accessor methods
Object.assign(TemperatureSensor.prototype, IOPinAccessorsMixin);