import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

export const createRequestLogger = () => {
  return (c: any, next: any) => {
    const start = Date.now();
    const method = c.req.method;
    const url = c.req.url;
    const userAgent = c.req.header('User-Agent') || 'unknown';

    logger.info('Request received', {
      method,
      url,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    return next()
      .then(() => {
        const duration = Date.now() - start;
        const status = c.res.status;

        logger.info('Request completed', {
          method,
          url,
          status,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });
      })
      .catch((error: Error) => {
        const duration = Date.now() - start;

        logger.error('Request failed', {
          method,
          url,
          error: error.message,
          stack: error.stack,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });

        throw error;
      });
  };
};

export const logBusinessEvent = (event: string, data: any) => {
  logger.info('Business event', {
    event,
    data,
    timestamp: new Date().toISOString(),
  });
};

export const logError = (error: Error, context?: any) => {
  logger.error('Application error', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
};
