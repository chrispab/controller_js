import logger from '../services/logger.js';
import mqttAgent from '../services/mqttAgent.js';
import secret from '../secret.js';
import nodemailer from 'nodemailer';

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
 * Logs a message and publishes a state to an MQTT topic.
 * @param {string} preComment - A descriptive comment for the log.
 * @param {string} pubToTopic - The MQTT topic to publish to.
 * @param {*} message - The message/state value to publish. It will be converted to a string.
 */
const logAndPublishState = (preComment, pubToTopic, message) => {
  logger.info(`->${preComment}: ${pubToTopic}: ${message}`);
  mqttAgent.client.publish(pubToTopic, String(message));
};

// export utils;
export { logAndPublishState, getHMSStr, sendEmail };
