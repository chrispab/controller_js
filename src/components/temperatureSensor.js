import IOBase from "../components/IOBase.js";
// import config from './../config.json' assert { type: 'json' }; // NodeJS version.
import os from 'os';
// const DHT = require('adafruit-dht-sensor-library');
const DHT_PIN = 4;
import sensor from 'node-dht-sensor';
// var sensor = require("node-dht-sensor");
import Logger from "./../services/Logger.js";
import config from '../config/config.json' assert { type: 'json' }; // NodeJS version.


var temperatureStateChangeHandler = function (state, mqttAgent) {
  Logger.log('warn', 'PUBLISH temperature: ' + `${state}`);
  mqttAgent.client.publish(config.mqtt.outTopic + "/temperature_state", `${state}`);
}



export default class TemperatureSensor extends IOBase {
  constructor(dhtSensorType, dhtSensorPin, emitterManager, mqttAgent) {
    super();
    this.emitterManager = emitterManager;
    this.mqttAgent = mqttAgent;
    this.dhtSensorType = dhtSensorType;
    this.dhtSensorPin = dhtSensorPin;
    this.temperature = 0;
    this.humidity = 0;

    console.log(os.hostname());
    if (os.hostname() !== "zone3" && os.hostname() !== "zone1") {
      sensor.initialize({
        test: {
          fake: {
            temperature: 21,
            humidity: 60
          }
        }
      });
    }
    this.emitterManager.on('temperatureStateChange', temperatureStateChangeHandler);

    //set new reading available
    this.setNewStateAvailable(true);
    this.processCount = 0;
  }

  read() {
    var self = this;

    sensor.read(this.dhtSensorType, this.dhtSensorPin, function (err, temperature, humidity) {
      let sensorData = { 'temperature': 0, 'humidity': 0 };
      if (!err) {
        // check if new value
        if (temperature !== self.temperature) {
          self.setNewStateAvailable(true);
          self.setTemperature(temperature);
          self.setHumidity(humidity);
        }

        sensorData.temperature = self.getTemperature();
        sensorData.humidity = self.getHumidity();

        // console.log(`READ from DHT sensor: temperature${self.getSensorStr()}`);
        return sensorData;

      } else {
        console.log("Failed to read from DHT sensor");
      }
    });

  }


  // create setters
  setTemperature(temperature) {
    this.temperature = temperature;
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
  process() {
    this.processCount = this.processCount ? this.processCount + 1 : 1;

    var data = this.read();
    if (this.hasNewStateAvailable()) {
      //get value from read()
      // console.log(`${this.processCount}->NEW temperature from DHT sensor: ${this.getSensorStr()}`);
      // Logger.info(`${this.processCount}->NEW temperature: ${this.getSensorStr()}`);
      this.emitterManager.emit('temperatureStateChange', this.getTemperature().toFixed(1), this.mqttAgent);
      // this.prevStateChangeMillis = Date.now();
      this.setNewStateAvailable(false);

    }
  }

  getSensorStr() {
    return `temp: ${this.getTemperature().toFixed(1)}°C, ` +
      `humidity: ${this.getHumidity().toFixed(1)}%`
  }
}

