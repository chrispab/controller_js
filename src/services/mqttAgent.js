import logger from './logger.js';
import cfg from './config.js';
import mqtt from 'mqtt';
import wifi from 'node-wifi';

// Initialize wifi module (important even if iface is null)
wifi.init({ iface: null });

class MqttAgent {
  constructor() {
    const options = {
      will: {
        topic: cfg.get('mqtt.topicPrefix') + '/LWT',
        retain: true,
        qos: 2,
        payload: 'Offline',
      },
    };
    this.client = mqtt.connect(cfg.get('mqtt.brokerUrl'), options);
    this.telemetryIntervalMs = cfg.get('telemetry.interval');
    this.lastTelemetryMs = Date.now() - this.telemetryIntervalMs;
    this.logLevel = 'info';
    this.highSetpoint = cfg.get('zone.highSetpoint');
    this.lowSetpoint = cfg.get('zone.lowSetpoint');
  }

  publishAndLog(topic, payload) {
    this.client.publish(topic, payload);
    logger.log(this.logLevel, `MQTT->${topic}: ${payload}`);
  }

  async getWifiSignalStrength() {
    try {
      const connections = await this.getCurrentConnectionsPromise();
      if (connections && connections.length > 0) {
        return connections[0].quality;
      } else {
        logger.warn('No WiFi connections found.');
        return null; // Or a default value like -1
      }
    } catch (error) {
      logger.error('Error getting WiFi signal strength:', error);
      return null;
    }
  }

  getCurrentConnectionsPromise() {
    return new Promise((resolve, reject) => {
      wifi.getCurrentConnections((error, connections) => {
        if (error) {
          reject(error);
        } else {
          resolve(connections);
        }
      });
    });
  }

  async process(components) {
    this.processCount = this.processCount ? this.processCount + 1 : 1;

    if (this.lastTelemetryMs + this.telemetryIntervalMs < Date.now()) {
      this.lastTelemetryMs = Date.now();
      const data = this.getTelemetryData(components);
      this.publishAndLog(cfg.get('mqtt.topicPrefix') + cfg.get('mqtt.telemetryTopic'), data);

      const rssi = await this.getWifiSignalStrength();
      let rssiData; // Declare rssiData outside the if block

      // if (rssi !== null) {
      console.log(`/rssi ${rssi}`);
      if (rssi !== null) {
        rssiData = { state: rssi }; // Assign to rssiData inside the if block
      } else {
        rssiData = { state: null, error: 'Could not get rssi' }; //handle null values
      }
      this.publishAndLog(cfg.get('mqtt.topicPrefix') + '/rssi', JSON.stringify(rssiData));
      // }
    }
  }

  // getTelemetryData(components) {
  //   try {
  //     const telemetryData = components.map((component, index) => {
  //       const componentData = component.getTelemetryData();
  //       console.log(`Telemetry data from component ${index} (${component.getName()}):`, componentData, typeof componentData); // Added logging
  //       return componentData;
  //     });
  //     return JSON.stringify(telemetryData);
  //   } catch (error) {
  //     logger.error("Error creating telemetry data:", error);
  //     return JSON.stringify({ error: "Failed to create telemetry data" });
  //   }
  // }

  getTelemetryData(components) {
    try {
      const telemetryData = components.map((component, index) => {
        const componentData = component.getTelemetryData();
        const type = typeof componentData;
        console.log(
          `Component ${index} (${component.getName()}): Data = ${JSON.stringify(componentData)}, Type = ${type}`
        );

        if (type !== 'object' && type !== 'string') {
          console.error(`Component ${index} (${component.getName()}) returned invalid data type: ${type}`);
        }

        return componentData; // Still return the data even if it's not an object, to see the effect on the final JSON string
      });
      const jsonData = JSON.stringify(telemetryData);
      console.log('Final Telemetry JSON:', jsonData);
      return jsonData;
    } catch (error) {
      logger.error('Error creating telemetry data:', error);
      return JSON.stringify({ error: 'Failed to create telemetry data' });
    }
  }
}

// Export an instance for singleton behavior
export const mqttAgent = new MqttAgent();
export default mqttAgent;

mqttAgent.client.on('connect', () => {
  logger.info('MQTT client connected:', JSON.stringify(mqttAgent.client.options));
  mqttAgent.client.subscribe([
    cfg.get('mqtt.topicPrefix') + '/high_setpoint/set',
    cfg.get('mqtt.topicPrefix') + '/low_setpoint/set',
  ]);
  mqttAgent.publishAndLog(cfg.get('mqtt.topicPrefix') + '/LWT', 'Online', {
    qos: 0,
    retain: true,
  });
});

mqttAgent.client.on('message', (topic, message) => {
  logger.warn(`Received message on topic ${topic}: ${message}`);
  //Simplified message handling - moved to a switch case
  const topicPrefix = cfg.get('mqtt.topicPrefix');
  switch (topic) {
    case `${topicPrefix}/high_setpoint/set`:
      cfg.set('zone.highSetpoint', Number(message.toString()));
      mqttAgent.publishAndLog(`${topicPrefix}/high_setpoint`, cfg.get('zone.highSetpoint'));
      break;
    case `${topicPrefix}/low_setpoint/set`:
      cfg.set('zone.lowSetpoint', Number(message.toString()));
      mqttAgent.publishAndLog(`${topicPrefix}/low_setpoint`, cfg.get('zone.lowSetpoint'));
      break;
    default:
      logger.error(`Topic "${topic}" not recognized.`);
  }
});
