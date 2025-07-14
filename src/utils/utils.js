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

function getHMSStr() {
  const date = new Date(Date.now());
  const hh = `0${date.getHours()}`.slice(-2);
  const mm = `0${date.getMinutes()}`.slice(-2);
  const ss = `0${date.getSeconds()}`.slice(-2);
  // console.log(`${hh}:${mm}:${ss}`);
  return `${hh}:${mm}:${ss}`;
}

const logAndPublishState = (mqttAgent, comment, topic, state) => {
  var logLevel = 'info';
  logger.log(logLevel, '>' + comment + `: ${topic + ': ' + state}`);
  mqttAgent.client.publish(topic, `${state}`);
};

// export utils;
export { logAndPublishState, getHMSStr, sendEmail };
