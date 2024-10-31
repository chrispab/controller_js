import IOBase from "../components/IOBase.js";
import os from 'os';
import sensor from 'node-dht-sensor';
import logger from "../services/logger.js";
// import cfg from "config";
import cfg from "../services/config.js";

var temperatureStateChangeHandler = function (temperatureState, humidityState, mqttAgent) {
  logger.log('info', 'MQTT->Temp: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.temperatureStateTopic") + ": " + (temperatureState)}`);
  mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.temperatureStateTopic"), `${temperatureState}`);

  logger.log('info', 'MQTT->Humi: ' + `${cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.humidityStateTopic") + ": " + (humidityState)}`);
  mqttAgent.client.publish(cfg.get("mqtt.topicPrefix") + cfg.get("mqtt.humidityStateTopic"), `${humidityState}`);
}


export default class TemperatureSensor extends IOBase {
  constructor(dhtSensorType, dhtSensorPin, emitterManager, mqttAgent) {
    super(dhtSensorPin, 'in', 0);
    this.setName('temperatureSensor');
    this.emitterManager = emitterManager;
    this.mqttAgent = mqttAgent;
    this.dhtSensorType = dhtSensorType;
    this.dhtSensorPin = dhtSensorPin;
    this.temperature = 0;
    this.humidity = 0;

    this.sensorReadIntervalMs = cfg.get("temperatureSensor.sensorReadIntervalMs");
    this.lastSensorReadTimeMs = Date.now() - this.sensorReadIntervalMs;
    this.processCount = 0;
    this.lastStatePublishedMs = Date.now();
    this.publishStateIntervalMs = cfg.get("temperatureSensor.publishStateIntervalMs");
    this.emitterManager.on('temperatureStateChange', temperatureStateChangeHandler);

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
  }

  process() {
    this.processCount = this.processCount ? this.processCount + 1 : 1;

    // ensure regular state publishing, at least every publishStateIntervalMs
    if (Date.now() >= this.lastStatePublishedMs + this.publishStateIntervalMs) {
      this.lastStatePublishedMs = Date.now();
      this.emitterManager.emit('temperatureStateChange', this.getTemperature(), this.getHumidity(), this.mqttAgent);
    }

    // do an actual read of the sensor every sensorReadIntervalMs
    if (Date.now() >= this.lastSensorReadTimeMs + this.sensorReadIntervalMs) {
      this.readSensor();
      this.lastSensorReadTimeMs = Date.now();
      if (this.hasNewStateAvailable()) {
        //get value from readSensor()
        // Logger.info(`${this.processCount}->NEW temperature: ${this.getSensorStr()}`);
        this.lastStatePublishedMs = Date.now();
        this.emitterManager.emit('temperatureStateChange', this.getTemperature(), this.getHumidity(), this.mqttAgent);
        this.setNewStateAvailable(false);

      }
    }
  }

  getTelemetryData() {

    let superTelemetry = this.getBaseTelemetryData();

    logger.log('debug', `tele temp: ${JSON.stringify(superTelemetry)}`); // logger.error(JSON.stringify(superTelemetry));

    return superTelemetry;
  }

  readSensor() {
    var self = this;
    // logger.info("Trying to Read from DHT sensor...");
    sensor.read(this.dhtSensorType, this.dhtSensorPin, function (err, temperature, humidity) {
      let sensorData = { 'temperature': 0, 'humidity': 0 };
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


  getSensorStr() {
    return `temp: ${this.getTemperature()}°C, ` +
      `humidity: ${this.getHumidity()}%`
  }
}

