//additions to 'config'
//to support runtime adjusted configuration is written back to disk
//so it can be restored to last saved settings when app restarts
// import c from "config";
// import config from "config";
// import logger from "./logger";
import logger from "./logger.js";

import fs from 'fs';

class ConfigHandler {
    constructor() {

        // const cfg = fs.loadFile('./config/default.json');
        this.config = this.load();

        logger.log('error', 'config: ' + JSON.stringify(this.config, null, 2));
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
        saveConfig(this.config);
    }

    get(stringkey) {

        const name = getValueByPath(this.config, stringkey);

        return name;
    }

    set(key, value) {

        var file_content = fs.readFileSync("./config/default.json");
        var content = JSON.parse(file_content);

        // const oldhisp = this.get("zone.highSetpoint");
        // logger.log('error', 'oldhisp: ' + oldhisp);
        const mergedObj = merge({ ...content }, { ...value })

        // fs.writeFileSync("./config/default2.json", JSON.stringify(mergedObj, null, 2));

        this.saveConfig(mergedObj);

        this.config = this.load();
        // const newhisp = this.get("zone.highSetpoint");
        // logger.log('error', 'newhisp: ' + newhisp);

    }

    saveConfig(mergedObj) {
        fs.writeFileSync("./config/default2.json", JSON.stringify(mergedObj, null, 2));

    }


}

/**
 * Merges two objects, if the value is an object, merge the two objects.
 * https://stackoverflow.com/questions/65817636/update-nested-js-objects-without-overwriting-missing-properties
 * @param {Object} target - The target object to merge into.
 * @param {Object} source - The source object to merge from.
 * @returns The merged object.
 */
const merge = (target, source) => {
    // Iterate through `source` properties and if an `Object` set property to merge of `target` and `source` properties
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object) Object.assign(source[key], merge(target[key], source[key]))
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
