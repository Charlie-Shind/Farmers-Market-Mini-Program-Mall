import { APP_ENV } from '../config/index';

type LogArgs = unknown[];

export const logger = {
  debug: (...args: LogArgs) => {
    if (APP_ENV === 'dev') {
      console.debug('[DEBUG]', ...args);
    }
  },
  info: (...args: LogArgs) => {
    if (APP_ENV !== 'prod') {
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args: LogArgs) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: LogArgs) => {
    console.error('[ERROR]', ...args);
  },
};
