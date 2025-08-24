
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import logger from './logger.js';
import { webSocketBroadcast } from './webSocketServer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultPath = resolve(__dirname, '../config/default.json');
const customPath = resolve(__dirname, '../config/custom_config.json');

/**
 * DataStore is a service class for managing application configuration and state.
 * It provides immutable access and updates to a private data object, supporting
 * dot-notation paths for nested property retrieval and updates.
 *
 * Configuration changes are persisted to disk, and state updates are broadcast
 * to connected WebSocket clients.
 *
 * @class
 * @private
 *
 * @property {Object} #data - Private field holding the immutable state and configuration.
 *
 * @method constructor
 *   Initializes the DataStore by loading configuration from disk and setting up the initial state.
 *
 * @method loadJson
 *   Loads and parses a JSON file from the specified path.
 *   @param {string} path - The file path to load.
 *   @returns {Object} The parsed JSON object, or an empty object on error.
 *
 * @method saveConfig
 *   Persists the current configuration to disk.
 *
 * @method get
 *   Retrieves a value from the data store using a dot-notation path.
 *   @param {string} path - The dot-notation path to the property.
 *   @returns {*} The value at the specified path, or undefined if not found.
 *
 * @method getWithMQTTPrefix
 *   Retrieves a configuration value and prepends the MQTT topic prefix.
 *   @param {string} stringkey - The dot-notation path to the configuration property.
 *   @returns {string} The prefixed MQTT topic string.
 *   @throws {Error} If the key or prefix does not exist.
 *
 * @method set
 *   Sets a value in the data store using a dot-notation path, ensuring immutability.
 *   Persists configuration changes and broadcasts state updates.
 *   @param {string} path - The dot-notation path to set.
 *   @param {*} value - The value to set.
 *
 * @method getValueByPath
 *   Retrieves a value from a nested object using a dot-notation path.
 *   @param {Object} obj - The object to query.
 *   @param {string} path - The dot-notation path.
 *   @returns {*} The value at the specified path, or undefined.
 *
 * @method setValueByPath
 *   Sets a value in a nested object using a dot-notation path, returning a new object.
 *   @param {Object} obj - The object to update.
 *   @param {string} path - The dot-notation path.
 *   @param {*} value - The value to set.
 *   @returns {Object} The updated object.
 */
class DataStore {
  #data; // Private field to hold the state object

  constructor() {
    // const defaultConfig = this.loadJson(defaultPath);
    const customConfig = this.loadJson(customPath);

    // const initialConfig = { ...defaultConfig, ...customConfig };

    this.#data = Object.freeze({
      config: customConfig,
      state: {
        lastChange: null,
        timeStamp: null,
      },
    });

    logger.info('DataStore initialized.');
  }

  /**
   * Loads and parses a JSON file from the specified path.
   * @param {string} path - The file path to load.
   * @returns {Object} The parsed JSON object, or an empty object on error.
   */
  loadJson(path) {
    if (fs.existsSync(path)) {
      try {
        const fileContent = fs.readFileSync(path);
        logger.info('Configuration json loaded from ' + path);
        return JSON.parse(fileContent);
      } catch (error) {
        logger.error(`Error reading or parsing JSON at ${path}:`, error);
        return {};
      }
    }
    return {};
  }

  /**
   * Persists the current configuration to the custom configuration file.
   * The configuration data is retrieved from the private `#data` field under the `config` key.
   */
  saveConfig() {
    try {
      fs.writeFileSync(customPath, JSON.stringify(this.#data.config, null, 2));
      logger.info('Configuration saved to custom_config.json');
    } catch (error) {
      logger.error('Error saving configuration:', error);
    }
  }

  get(path) {
    return this.getValueByPath(this.#data, path);
  }

  
  /**
   * Retrieves a value from the configuration using a dot-notation path and prepends the MQTT topic prefix.
   * @param {string} stringkey - The dot-notation path to the configuration property (e.g., 'mqtt.fanStateTopic').
   * @returns {string} The value of the configuration property with the MQTT topic prefix.
   * @throws {Error} If the key or the MQTT topic prefix does not exist in the configuration.
   */
  getWithMQTTPrefix(stringkey) {
    const value = this.get(`config.${stringkey}`);
    const prefix = this.get('config.mqtt.topicPrefix');
    if (value === undefined || prefix === undefined) {
      logger.log('error', 'config: ' + stringkey + ' does not exist');
      throw new Error(stringkey + ' does not exist');
    }
    return prefix + '/' + value;
  }


  /**
   * Sets a value in the data store using a dot-notation path.
   *
   * This method ensures that updates are made immutably. It creates a new
   * state object with the updated value rather than modifying the existing state.
   * The path must start with either 'config' or 'state'.
   *
   * If a value under 'config' is changed, the entire configuration is saved to disk.
   * After any update, the new 'state' object is broadcast to all connected WebSocket clients.
   *
   * @param {string} path - The dot-notation path to the value to set (e.g., 'state.fans[0].speed').
   * @param {*} value - The new value to set at the specified path.
   */
  set(path, value) {
    const pathArray = path.split('.');
    const topLevelKey = pathArray[0];

    if (topLevelKey !== 'config' && topLevelKey !== 'state') {
      logger.error(`Invalid top-level key: ${topLevelKey}. Must be 'config' or 'state'.`);
      return;
    }

    const oldState = this.#data;
    const newState = this.setValueByPath(oldState, path, value);

    this.#data = Object.freeze(newState);

    if (topLevelKey === 'config') {
      this.saveConfig();
    }

    logger.warn(`SSSSSS..datastore set() webSocketBroadcast  ..Data updated: ${path} = ${value}`);
    webSocketBroadcast(this.get('state'));
  }

  /**
   * Retrieves a value from a nested object using a dot-notation path.
   * @param {object} obj - The object to query.
   * @param {string} path - The dot-notation path to the property.
   * @returns {*|undefined} The value at the specified path, or undefined if the path does not exist.
   */
  getValueByPath(obj, path) {
    const keys = path.split('.');
    let value = obj;

    for (let key of keys) {
      if (typeof value === 'object' && value !== null) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    return value;
  }

  /**
   * Sets a value in a nested object using a dot-notation path, returning a new object.
   * This function creates a deep copy of the original object to ensure immutability.
   * @param {Object} obj - The object to modify.
   * @param {String} path - The path to the property (e.g., 'a.b.c').
   * @param {*} value - The value to set.
   */
  setValueByPath(obj, path, value) {
    const keys = path.split('.');
    const newObj = JSON.parse(JSON.stringify(obj)); // Deep copy for immutability
    let current = newObj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return newObj;
  }
}

export const dataStore = new DataStore();
export default dataStore;
