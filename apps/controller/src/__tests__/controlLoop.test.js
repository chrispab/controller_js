// Fully mock mqttAgent to prevent real connections and side effects
jest.mock('../services/mqttAgent', () => ({
  mqttAgent: {
    client: {
      on: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn(),
      end: jest.fn(),
      connected: false,
    },
    setactiveSetpoint: jest.fn(),
    process: jest.fn(),
  },
  default: {
    // Mock the default export as well
    client: {
      on: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn(),
      end: jest.fn(),
      connected: false,
    },
    setactiveSetpoint: jest.fn(),
    process: jest.fn(),
  },
}));

import {
  startControlLoop,
  controllerStatus,
  updateAndBroadcastStatusIfValueChanged,
} from '../controlLoop';
import cfg from '../services/config';
import logger from '../services/logger';
import eventEmitter from '../services/eventEmitter';

// Mock external dependencies that might cause issues
jest.mock('node-wifi');
jest.mock('nodemailer');

// Mock services
jest.mock('../services/config');
jest.mock('../services/webSocketServer');
jest.mock('../services/logger');
jest.mock('../services/eventEmitter');

// Explicitly mock the 'ws' module
jest.mock('ws', () => ({
  WebSocketServer: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    clients: [],
  })),
}));

// Import the mocked mqttAgent after it's been mocked
import mqttAgent from '../services/mqttAgent';

// Mock component classes with their methods directly in jest.mock
jest.mock('../components/fan', () => {
  const mockFan = jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    process: jest.fn(),
  }));
  return mockFan;
});
jest.mock('../components/heater', () => {
  const mockHeater = jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    process: jest.fn(),
  }));
  return mockHeater;
});
jest.mock('../components/light', () => {
  const mockLight = jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    process: jest.fn(),
  }));
  return mockLight;
});
jest.mock('../components/temperatureSensor', () => {
  const mockTemperatureSensor = jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    process: jest.fn(),
  }));
  return mockTemperatureSensor;
});
jest.mock('../components/vent', () => {
  const mockVent = jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    process: jest.fn(),
  }));
  return mockVent;
});

// Import component constructors for assertions
import Fan from '../components/fan';
import Heater from '../components/heater';
import Light from '../components/light';
import TemperatureSensor from '../components/temperatureSensor';
import Vent from '../components/vent';

describe('controlLoop', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset controllerStatus to its initial state for each test
    controllerStatus.zoneName = 'testZone';
    controllerStatus.version = '1.0.0';
    controllerStatus.releaseNotes = 'Initial release';
    controllerStatus.description = 'Test description';
    controllerStatus.setpoint = null;
    controllerStatus.timeStamp = null;
    controllerStatus.temperature = null;
    controllerStatus.humidity = null;
    controllerStatus.light = null;
    controllerStatus.heater = null;
    controllerStatus.fan = null;
    controllerStatus.ventPower = null;
    controllerStatus.ventSpeed = null;
    controllerStatus.ventTotal = null;
    controllerStatus.SensorSoilMoistureRaw = null;
    controllerStatus.soilMoisturePercent = null;
    controllerStatus.irrigationPump = null;
    controllerStatus.lastChange = null;
    controllerStatus.ventOnDurationDaySecs = null;
    controllerStatus.ventOffDurationDaySecs = null;
    controllerStatus.ventOnDurationNightSecs = null;
    controllerStatus.ventOffDurationNightSecs = null;
    controllerStatus.outsideTemperature = null;
    controllerStatus.activeSetpoint = null;

    // Mock cfg.get values
    cfg.get.mockImplementation((key) => {
      switch (key) {
        case 'zone.name':
          return 'testZone';
        case 'hardware.fan.pin':
          return 1;
        case 'hardware.heater.pin':
          return 2;
        case 'hardware.RC.pin':
          return 3;
        case 'hardware.dhtSensor.pin':
          return 4;
        case 'hardware.vent.pin':
          return 5;
        case 'hardware.vent.speedPin':
          return 6;
        case 'zone.highSetpoint':
          return 25;
        case 'zone.lowSetpoint':
          return 20;
        case 'mqtt.brokerUrl':
          return 'mqtt://localhost';
        case 'mqtt.LWTTopic':
          return 'test/LWT';
        case 'telemetry.interval':
          return 60000;
        case 'zone.periodicPublishIntervalMs':
          return 300000;
        case 'version':
          return '1.0.0';
        default:
          return undefined;
      }
    });
    cfg.getWithMQTTPrefix.mockImplementation((key) => `test/${key}`);
  });

  describe('updateAndBroadcastStatusIfValueChanged', () => {
    test('should update status and broadcast if value changes', () => {
      const initialTemperature = controllerStatus.temperature;
      const newTemperature = 22;

      updateAndBroadcastStatusIfValueChanged('temperature', newTemperature);

      expect(controllerStatus.temperature).toBe(newTemperature);
      expect(controllerStatus.lastChange).toBe('temperature = 22');
      expect(controllerStatus.timeStamp).toBeDefined();
      expect(broadcast).toHaveBeenCalledWith(controllerStatus);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('State changed: temperature = 22'),
      );
    });

    test('should not update status or broadcast if value is the same', () => {
      const initialTemperature = 22;
      controllerStatus.temperature = initialTemperature;
      controllerStatus.lastChange = 'initial';
      controllerStatus.timeStamp = 123;

      updateAndBroadcastStatusIfValueChanged('temperature', initialTemperature);

      expect(controllerStatus.temperature).toBe(initialTemperature);
      expect(controllerStatus.lastChange).toBe('initial'); // Should not change
      expect(controllerStatus.timeStamp).toBe(123); // Should not change
      expect(broadcast).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('State changed'),
      );
    });
  });

  describe('startControlLoop', () => {
    beforeEach(() => {
      jest.useFakeTimers(); // Use fake timers for setInterval
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.clearAllTimers(); // Clear any remaining timers
      jest.useRealTimers(); // Restore real timers
    });

    afterAll(() => {
      // Ensure the MQTT client is disconnected after all tests are done
      // Check if mqttAgent.client and its end method exist before calling
      if (
        mqttAgent &&
        mqttAgent.client &&
        typeof mqttAgent.client.end === 'function'
      ) {
        mqttAgent.client.end();
      }
    });

    test('should initialize components and set initial irrigationPump status', () => {
      startControlLoop();

      // Expect component constructors to be called with correct pins
      expect(Fan).toHaveBeenCalledWith('fan', 1);
      expect(Heater).toHaveBeenCalledWith('heater', 2);
      expect(Light).toHaveBeenCalledWith('light', 3);
      expect(TemperatureSensor).toHaveBeenCalledWith('temperature_sensor', 4);
      expect(Vent).toHaveBeenCalledWith('vent', 5, 6);

      // Expect initial irrigationPump status to be set
      expect(controllerStatus.irrigationPump).toBe(false);
      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ irrigationPump: false }),
      );
    });

    test('should set up event listeners and update status accordingly', () => {
      startControlLoop();

      // Simulate temperatureChanged event
      eventEmitter.emit('temperatureChanged', { temperature: 23 });
      expect(controllerStatus.temperature).toBe(23);
      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 23 }),
      );

      // Simulate humidityChanged event
      eventEmitter.emit('humidityChanged', { humidity: 60 });
      expect(controllerStatus.humidity).toBe(60);
      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ humidity: 60 }),
      );

      // Simulate lightStateChanged event (light on)
      eventEmitter.emit('lightStateChanged', { lightState: true });
      expect(controllerStatus.light).toBe(true);
      expect(controllerStatus.setpoint).toBe(25); // highSetpoint
      expect(mqttAgent.setactiveSetpoint).toHaveBeenCalledWith(25);
      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ light: true, setpoint: 25 }),
      );

      // Simulate lightStateChanged event (light off)
      eventEmitter.emit('lightStateChanged', { lightState: false });
      expect(controllerStatus.light).toBe(false);
      expect(controllerStatus.setpoint).toBe(20); // lowSetpoint
      expect(mqttAgent.setactiveSetpoint).toHaveBeenCalledWith(20);
      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ light: false, setpoint: 20 }),
      );

      // Simulate fan/started event
      eventEmitter.emit('fan/started', { name: 'fan' });
      expect(controllerStatus.fan).toBe(true);
      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ fan: true }),
      );

      // Simulate fan/stopped event
      eventEmitter.emit('fan/stopped', { name: 'fan' });
      expect(controllerStatus.fan).toBe(false);
      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ fan: false }),
      );

      // Simulate heaterStateChanged event
      eventEmitter.emit('heaterStateChanged', { state: true });
      expect(controllerStatus.heater).toBe(true);
      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ heater: true }),
      );

      // Simulate ventStateChanged event (state 0)
      eventEmitter.emit('ventStateChanged', { state: 0 });
      expect(controllerStatus.ventTotal).toBe(0);
      expect(controllerStatus.ventPower).toBe(0);
      expect(controllerStatus.ventSpeed).toBe(0);
      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ ventTotal: 0, ventPower: 0, ventSpeed: 0 }),
      );

      // Simulate ventStateChanged event (state 1)
      eventEmitter.emit('ventStateChanged', { state: 1 });
      expect(controllerStatus.ventTotal).toBe(1);
      expect(controllerStatus.ventPower).toBe(1);
      expect(controllerStatus.ventSpeed).toBe(0);
      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ ventTotal: 1, ventPower: 1, ventSpeed: 0 }),
      );

      // Simulate ventStateChanged event (state 2)
      eventEmitter.emit('ventStateChanged', { state: 2 });
      expect(controllerStatus.ventTotal).toBe(2);
      expect(controllerStatus.ventPower).toBe(1);
      expect(controllerStatus.ventSpeed).toBe(1);
      expect(broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ ventTotal: 2, ventPower: 1, ventSpeed: 1 }),
      );
    });

    test('should set up periodic services', () => {
      startControlLoop();

      // Advance timers to trigger setIntervals
      jest.advanceTimersByTime(1000); // For cfg.process()
      expect(cfg.process).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(5000); // For mqttAgent.process()
      expect(mqttAgent.process).toHaveBeenCalledTimes(1);

      // Check multiple calls
      jest.advanceTimersByTime(1000);
      expect(cfg.process).toHaveBeenCalledTimes(2);
      jest.advanceTimersByTime(5000);
      expect(mqttAgent.process).toHaveBeenCalledTimes(2);
    });
  });
});
