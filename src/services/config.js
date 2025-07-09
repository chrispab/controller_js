import logger from './logger.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Construct absolute paths to the configuration files to avoid issues with the current working directory.
const defaultPath = resolve(__dirname, '../config/default.json');
const customPath = resolve(__dirname, '../config/custom_config.json');

class ConfigHandler {
  constructor() {
    this.config = this.load();
    this.configHasChanged = false;
    this.configChangedTime = null;
    this.delayBeforeConfigSaveMs = this.get('config.delayBeforeConfigSaveMs');
  }

  /**
   * Processes the configuration, checking if it has changed and saving it if enough time has passed.
   * This method is typically called periodically to ensure configuration changes are persisted.
   * @returns {void}
   */
  process() {
    // Check if config has changed and if enough time has passed to save it
    if (this.configHasChanged && Date.now() - this.configChangedTime > this.delayBeforeConfigSaveMs) {
      this.save();
      this.configHasChanged = false;
      this.configChangedTime = null;
    }
  }

  /**
   * Loads the configuration from either the custom configuration file if it exists,
   * or falls back to the default configuration file.
   * @returns {object} The parsed configuration object.
   */
  load() {
    // Initialize file_content to null
    var file_content = null;
    // Check if the custom configuration file exists
    if (fs.existsSync(customPath)) {
      logger.log('warn', `custom configuration file ${customPath} exists`);
      // If it exists, read its content
      file_content = fs.readFileSync(customPath);
    } else {
      // If not, read the content of the default configuration file
      file_content = fs.readFileSync(defaultPath);
      logger.log('warn', `custom configuration file ${customPath} does not exist. Using default configuration file ${defaultPath}`);
    }
    // Parse the JSON content and return the resulting object
    var content = JSON.parse(file_content);
    logger.log('warn',  `custom configuration file ${customPath} loaded`);

    return content;
  }

  /**
   * Saves the current configuration to the custom configuration file.
   * @returns {void}
   */
  save() {
    this.saveConfig(this.config);
  }

  /**
   * Retrieves a value from the configuration using a dot-notation path.
   * @param {string} stringkey - The dot-notation path to the configuration property (e.g., 'zone.highSetpoint').
   * @returns {*} The value of the configuration property.
   * @throws {Error} If the key does not exist in the configuration.
   */
  get(stringkey) {
    const value = getValueByPath(this.config, stringkey);
    if (value === undefined) {
      logger.log('error', 'config: ' + stringkey + ' does not exist');
      throw new Error(stringkey + ' does not exist');
    }
    // logger.log('info', 'config get stringkey: ' + stringkey + ' value: ' + value);
    return value;
  }

  /**
   * Retrieves a value from the configuration using a dot-notation path and prepends the MQTT topic prefix.
   * @param {string} stringkey - The dot-notation path to the configuration property (e.g., 'mqtt.fanStateTopic').
   * @returns {string} The value of the configuration property with the MQTT topic prefix.
   * @throws {Error} If the key or the MQTT topic prefix does not exist in the configuration.
   */
  getWithMQTTPrefix(stringkey) {
    const value = getValueByPath(this.config, stringkey);
    const prefix = getValueByPath(this.config, 'mqtt.topicPrefix');
    if (value === undefined || prefix === undefined) {
      logger.log('error', 'config: ' + stringkey + ' does not exist');
      throw new Error(stringkey + ' does not exist');
    }
    return prefix + value;
  }
  
  /**
   * Sets a value in the configuration using a dot-notation path.
   * @param {string} path - The path to the property (e.g., 'zone.highSetpoint').
   * @param {*} value - The value to set.
   */
  set(path, value) {
    setValueByPath(this.config, path, value);
    this.configHasChanged = true;
    this.configChangedTime = Date.now();
  }

  /**
   * Save the config object to the given path as a json file.
   * If path is not given, it defaults to "./config/custom_config.json".
   * @param {Object} configObj - The config object to save.
   * @param {String} [path] - The path to save the config to. Defaults to "./config/custom_config.json".
   */
  saveConfig(configObj, path = customPath) {
    fs.writeFileSync(path, JSON.stringify(configObj, null, 2));
  }
}

/**
 * Retrieves a value from a nested object using a dot-notation path.
 * @param {object} obj - The object to query.
 * @param {string} path - The dot-notation path to the property.
 * @returns {*|undefined} The value at the specified path, or undefined if the path does not exist.
 */
function getValueByPath(obj, path) {
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
 * Sets a value in a nested object using a dot-notation path.
 * @param {Object} obj - The object to modify.
 * @param {String} path - The path to the property (e.g., 'a.b.c').
 * @param {*} value - The value to set.
 */
function setValueByPath(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    // Create a new object if it doesn't exist or is not an object
    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

// export a single instance of ConfigHandler;
export const cfg = new ConfigHandler();
export default cfg;
