// const { createLogger, format, transports } = require('../');

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import process from 'process';

// Determine log level from environment variable, default to 'info'
const level = process.env.LOG_LEVEL || 'info';

const logger = winston.createLogger({
  level: level,
  format: winston.format.combine(
    winston.format.timestamp({
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    //
    // - Write to all logs with level `info` and below to `quick-start-combined.log`.
    // - Write all logs error (and below) to `quick-start-error.log`.
    new DailyRotateFile({
      filename: 'logs/controller_js-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d', // Keep logs for 14 days
      level: 'error'
    }),
    new DailyRotateFile({
      filename: 'logs/controller_js-combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

export default logger

//
// If we're not in production then **ALSO** log to the `console`
// with the colorized simple format.
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

  // ***************
// Allows for JSON logging
// ***************

// Logger.log({
//   level: 'info',
//   message: 'Pass an object and this works',
//   additional: 'properties',
//   are: 'passed along'
// });

// Logger.info({
//   message: 'Use a helper method if you want',
//   additional: 'properties',
//   are: 'passed along'
// });

// ***************
// Allows for parameter-based logging
// ***************

// Logger.log('info', 'Pass a message and this works', {
//   additional: 'properties',
//   are: 'passed along'
// });

// Logger.info('Use a helper method if you want', {
//   additional: 'properties',
//   are: 'passed along'
// });

// ***************
// Allows for string interpolation
// ***************

// info: test message my string {}
// Logger.log('info', 'test message %s', 'my string');

// // info: test message 123 {}
// Logger.log('info', 'test message %d', 123);

// // info: test message first second {number: 123}
// Logger.log('info', 'test message %s, %s', 'first', 'second', { number: 123 });

// prints "Found error at %s"
// Logger.info('Found %s at %s', 'error', new Date());
// Logger.info('Found %s at %s', 'error', new Error('chill winston'));
// Logger.info('Found %s at %s', 'error', /WUT/);
// Logger.info('Found %s at %s', 'error', true);
// Logger.info('Found %s at %s', 'error', 100.00);
// Logger.info('Found %s at %s', 'error', ['1, 2, 3']);

// // ***************
// // Allows for logging Error instances
// // ***************

// Logger.warn(new Error('Error passed as info'));

// Logger.log('error', new Error('Error passed as message'));

// Logger.warn('Maybe important error: ', new Error('Error passed as meta'));
// Logger.log('error', 'Important error: ', new Error('Error passed as meta'));

// Logger.error(new Error('Error as info'));
