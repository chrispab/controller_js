import logger from '../services/logger.js';
import mqttAgent from '../services/mqttAgent.js';
import secret from '../secret.js';
import nodemailer from 'nodemailer';

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersionInfo() {
  // Constructs the absolute path to the package.json file.
  // __dirname is the directory of the current module (utils.js).
  // '../../package.json' navigates up two directories to the project root and then to package.json.
  const packageJsonPath = resolve(__dirname, '../../../../package.json');
  // Reads the content of the package.json file synchronously and parses it as JSON.
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  // Returns an object containing the version and releaseNotes from package.json.
  return {
    version: packageJson.version,
    releaseNotes: packageJson.releaseNotes || '',
    description: packageJson.description || '',
  };
}

// const versionInfo = getVersionInfo();
// console.log(`Version: ${versionInfo.version}`);
// console.log(`Release Notes: ${versionInfo.releaseNotes}`);

function sendEmail(subject, body) {
  const mailOptions = {
    from: secret.user,
    to: secret.user,
    subject: subject,
    text: body,
    html: body,
  };
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: secret.user,
      pass: secret.password,
    },
  });
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      logger.log('error', error, { info: info });
    }
  });
}

/**
 * Returns the current time in HH:MM:SS format.
 *
 * @returns {string} The current time formatted as HH:MM:SS.
 */
function getHMSStr() {
  const date = new Date(Date.now());
  const hh = `0${date.getHours()}`.slice(-2);
  const mm = `0${date.getMinutes()}`.slice(-2);
  const ss = `0${date.getSeconds()}`.slice(-2);
  // console.log(`${hh}:${mm}:${ss}`);
  return `${hh}:${mm}:${ss}`;
}

/**
 * Logs a payload and publishes a state to an MQTT topic.
 * @param {string} preComment - A descriptive comment for the log.
 * @param {string} pubToTopic - The MQTT topic to publish to.
 * @param {*} payload - The payload/state value to publish. It will be converted to a string.
 */
const logAndPublishState = (preComment, pubToTopic, payload) => {
  logger.info(`->${preComment}: ${pubToTopic}: ${payload}`);
  mqttAgent.client.publish(pubToTopic, String(payload));
};

// export utils;
export { logAndPublishState, getHMSStr, sendEmail, getVersionInfo };
