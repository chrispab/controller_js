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
    var sensorData2 = { 'temperature': 0, 'humidity': 0 };
    var self = this;

    sensor.read(11, 4, function (err, temperature, humidity) {
      let sensorData = { 'temperature': 0, 'humidity': 0 };
      if (!err) {

        sensorData.temperature = temperature;
        sensorData.humidity = humidity;

        self.setTemperature(temperature);
        self.setHumidity(humidity);
        // this.humidity = humidity;

        // console.log(
        //   `temp: ${temperature.toFixed(1)}°C, ` +
        //   `humidity: ${humidity.toFixed(1)}%`
        // );
        // return sensorData;

      } else {
        console.log("Failed to read from DHT sensor");
        self.temperature = 1;
        self.humidity = 2;
        sensorData.temperature = 1;
        sensorData.humidity = 2;
      }
      return sensorData;
    });


    var sensorData2 = sensor.read(11, 4);
    // sensorData2.temperature = 4;
    // sensorData2.humidity = 5;
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
    // console.log(`Heater process count: ${this.processCount}`);
    //   console.log("Heater process");
    var data = this.read();
    this.temperature = data.temperature;
    this.humidity = data.humidity;
    // console.log(`Reading from DHT sensor: temperature ${this.temperature}C, humidity ${this.humidity}%`);
  }
  getSensorStr() {
    // const date = new Date(Date.now());
    // const hh = `0${date.getHours()}`.slice(-2);
    // const mm = `0${date.getMinutes()}`.slice(-2);
    // const ss = `0${date.getSeconds()}`.slice(-2);
    // console.log(`${hh}:${mm}:${ss}`);
    return `temp: ${this.temperature.toFixed(1)}°C, ` +
        `humidity: ${this.humidity.toFixed(1)}%`
    // return `${hh}:${mm}:${ss}`;
}
}
