import IOBase from "./IOBase.js";

// const DHT = require('adafruit-dht-sensor-library');
const DHT_PIN = 4;
import sensor from 'node-dht-sensor';
// var sensor = require("node-dht-sensor");

export default class TemperatureSensor extends IOBase {
  constructor() {
    super();
    this.temperature = 0;
    this.humidity = 0;
    sensor.initialize({
      test: {
        fake: {
          temperature: 21,
          humidity: 60
        }
      }
    });
  }

  read() {
    const sensorData = sensor.read(11, 4, function (err, temperature, humidity) {
      if (!err) {
        console.log(
          `temp: ${temperature.toFixed(1)}°C, ` +
          `humidity: ${humidity.toFixed(1)}%`
        );
      }
    });
    if (sensorData) {
      this.temperature = sensorData.temperature;
      this.humidity = sensorData.humidity;
    } else {
      console.log("Failed to read from DHT sensor");
    }
  }

  getTemperature() {
    return this.temperature;
  }

  getHumidity() {
    return this.humidity;
  }
  process() {
    this.processCount = this.processCount ? this.processCount + 1 : 1;
    // console.log(`Heater process count: ${this.processCount}`);
    //   console.log("Heater process");
    this.read();
    console.log(`Reading from DHT sensor: temperature ${this.temperature}C, humidity ${this.humidity}%`);
  }

}
