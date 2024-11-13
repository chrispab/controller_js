// const { createLogger, format, transports } = require('../');

import { createLogger } from 'winston';
import { format } from 'winston';
import { transports } from 'winston';

import process from 'process';


const logger = createLogger({
  // level: 'debug',
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  // defaultMeta: { service: 'controller_js' },
  transports: [
    //
    // - Write to all logs with level `info` and below to `quick-start-combined.log`.
    // - Write all logs error (and below) to `quick-start-error.log`.
    //
    new transports.File({ filename: 'logs/controller_js-error.log', level: 'error' }),
    new transports.File({ filename: 'logs/controller_js-combined.log' })
  ]
});

export default logger

//
// If we're not in production then **ALSO** log to the `console`
// with the colorized simple format.
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
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
