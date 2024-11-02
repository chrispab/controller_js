//additions to 'config'
//to support runtime adjusted configuration is written back to disk
//so it can be restored to last saved settings when app restarts

import logger from "./logger.js";
import fs from 'fs';


class ConfigHandler {
    constructor() {
        this.configHasChanged = false;
        this.configChangedTime = null;

        this.config = this.load();
        logger.log('error', 'config: ' + JSON.stringify(this.config, null, 2));
    }

    process() {

        if (this.configHasChanged  && Date.now() - this.configChangedTime > 5000) {
            this.save();
            this.configHasChanged = false;
            this.configChangedTime = null;
        }
    }
    load() {
        // load default.json file as an object
        if (fs.existsSync("./config/default2.json")) {
            logger.log('error', 'default2.json exists');
            var file_content = fs.readFileSync("./config/default2.json");
        }
        else {
            var file_content = fs.readFileSync("./config/default.json");
            logger.log('error', 'default2.json does not exist. Using default.json');
        }
        var content = JSON.parse(file_content);
        return content;
    }

    save() {
        this.saveConfig(this.config);
    }

    get(stringkey) {
        const name = getValueByPath(this.config, stringkey);
        return name;
    }

    set(key, valueObj) {

        // var file_content = fs.readFileSync("./config/default.json");
        // var content = JSON.parse(file_content);

        var currentConfig = this.config
        // const oldhisp = this.get("zone.highSetpoint");
        // logger.log('error', 'oldhisp: ' + oldhisp);
        const mergedObj = fullMerge({ ...currentConfig }, { ...valueObj })

        this.config = mergedObj;

        this.configHasChanged = true;
        this.configChangedTime = new Date();

        // this.saveConfig(mergedObj);
        // this.config = this.load();


        // const newhisp = this.get("zone.highSetpoint");
        // logger.log('error', 'newhisp: ' + newhisp);

    }

    /**
     * Save the config object to the given path as a json file.
     * If path is not given, it defaults to "./config/default2.json".
     * @param {Object} configObj - The config object to save.
     * @param {String} [path] - The path to save the config to. Defaults to "./config/default2.json".
     */
    saveConfig(configObj, path = "./config/default2.json") {
        fs.writeFileSync(path, JSON.stringify(configObj, null, 2));
        this.configHasChanged = false;
    }

}

/**
 * Merges two objects, if the value is an object, merge the two objects.
 * https://stackoverflow.com/questions/65817636/update-nested-js-objects-without-overwriting-missing-properties
 * @param {Object} target - The target object to merge into.
 * @param {Object} source - The source object to merge from.
 * @returns The merged object.
 */
const fullMerge = (target, source) => {
    // Iterate through `source` properties and if an `Object` set property to merge of `target` and `source` properties
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object) Object.assign(source[key], fullMerge(target[key], source[key]))
    }
    // Join `target` and modified `source`
    Object.assign(target || {}, source)
    return target
}

// Helper function to access nested objects and arrays
function getValueByPath(obj, path) {
    const keys = path.split(".");
    let value = obj;

    for (let key of keys) {
        if (typeof value === "object" && value !== null) {
            value = value[key];
        } else {
            return undefined;
        }
    }

    return value;
}
// export a single instance of ConfigHandler;
export const cfg = new ConfigHandler();
export default cfg;
