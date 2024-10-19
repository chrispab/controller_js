import IOBase from "./IOBase.js";
// import config from './../config.json' assert { type: 'json' }; // NodeJS version.
import os from 'os';
// const DHT = require('adafruit-dht-sensor-library');
const DHT_PIN = 4;
import sensor from 'node-dht-sensor';
// var sensor = require("node-dht-sensor");

export default class TemperatureSensor extends IOBase {
  constructor(dhtSensorType, dhtSensorPin) {
    super();
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

        console.log(`READ from DHT sensor: temperature${self.getSensorStr()}`);
        return sensorData;

      } else {
        console.log("Failed to read from DHT sensor");
      }
      // return sensorData;
    });


    var sensorData2 = {};
    // sensorData2.temperature = 4;
    // sensorData2.humidity = 5;
    sensorData2.temperature = this.temperature;
    sensorData2.humidity = this.humidity;
    return sensorData2;

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
    if (this.hasNewState()) {
      //get value from read()
      console.log(`PROCESS NEW  temperature state Reading from DHT sensor: ${this.getSensorStr()}`);

      this.setNewStateAvailable(false);

    }
  }

  getSensorStr() {
    return `temp: ${this.temperature.toFixed(1)}°C, ` +
      `humidity: ${this.humidity.toFixed(1)}%`
  }
}

