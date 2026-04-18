const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
};