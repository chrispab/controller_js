import IOBase from "../components/IOBase.js";
import os from 'os';
// const DHT_PIN = 4;
import sensor from 'node-dht-sensor';
import logger from "../services/logger.js";
import cfg from "config";

var temperatureStateChangeHandler = function (state, mqttAgent) {
  logger.log('warn', 'MQTT-PUB NEW Temperature: ' + `${state}`);
  mqttAgent.client.publish(cfg.get("mqtt.outTopic") + "/temperature_state", `${state}`);
}



export default class TemperatureSensor extends IOBase {
  constructor(dhtSensorType, dhtSensorPin, emitterManager, mqttAgent) {
    super(dhtSensorPin, 'in', 0);
    this.emitterManager = emitterManager;
    this.mqttAgent = mqttAgent;
    this.dhtSensorType = dhtSensorType;
    this.dhtSensorPin = dhtSensorPin;
    this.temperature = 0;
    this.humidity = 0;
    this.setName('temperatureSensor');

    this.minimumReadIntervalMs = cfg.get("temperatureSensor.minimumReadIntervalMs");
    this.lastVisitMs = Date.now();
    this.lastReadTimeMs = Date.now() - this.minimumReadIntervalMs;
    this.processCount = 0;


    logger.info(`HostName: ${os.hostname()}`);
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
    // this.setNewStateAvailable(true);
    this.processCount = 0;
  }

  readSensor() {
    var self = this;
    logger.debug("Read from DHT sensor...");
    sensor.read(this.dhtSensorType, this.dhtSensorPin, function (err, temperature, humidity) {
      let sensorData = { 'temperature': 0, 'humidity': 0 };
      if (!err) {
        // if new temp, save it
        if (temperature !== self.temperature) {
          self.setNewStateAvailable(true);
          //ensure stored values are to 1 decimal
          self.setTemperature(temperature.toFixed(1));
          self.setHumidity(humidity.toFixed(1));
        }

        sensorData.temperature = self.getTemperature();
        sensorData.humidity = self.getHumidity();

        console.log(`READ from DHT sensor: temperature${self.getSensorStr()}`);
        return sensorData;

      } else {
        logger.error("Failed to read from DHT sensor");
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
  process() {
    this.processCount = this.processCount ? this.processCount + 1 : 1;

    this.lastVisitMs = Date.now();

    if (Date.now() >= this.lastReadTimeMs + this.minimumReadIntervalMs) {
      this.readSensor();
      this.lastReadTimeMs = Date.now();
      if (this.hasNewStateAvailable()) {
        //get value from readSensor()
        // Logger.info(`${this.processCount}->NEW temperature: ${this.getSensorStr()}`);
        this.emitterManager.emit('temperatureStateChange', this.getTemperature(), this.mqttAgent);
        this.setNewStateAvailable(false);
      }
    }
  }

  getSensorStr() {
    return `temp: ${this.getTemperature()}°C, ` +
      `humidity: ${this.getHumidity()}%`
  }
}

