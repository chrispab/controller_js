// const winston = require('winston');
import winston from 'winston';
import { format } from 'winston';
import { transports } from 'winston';
// const logger = winston.createLogger({
//     level: 'info',
//     format: winston.format.json(),
//     transports: [new winston.transports.Console()],
//   });

//   const logger = winston.createLogger({
//     level: 'info',
//     format: winston.format.cli(),
//     transports: [new winston.transports.Console()],
//   });
const logger = winston.createLogger({
    // level: 'debug',
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'controller_js' },
    transports: [
        // new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/controller_js-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/controller_js-combined.log' })
    ]
});
//
// If we're not in production then **ALSO** log to the `console`
// with the colorized simple format.
//
// if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.combine(
            format.colorize(),
            format.simple()
        )
    }));
// }
