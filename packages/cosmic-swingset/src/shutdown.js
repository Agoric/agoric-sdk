/* global process */
// @ts-check
import anylogger from 'anylogger';

const console = anylogger('shutdown');

export const makeFreshShutdown = () => {
  const shutdownThunks = new Set();

  let shuttingDown = false;
  /** @type {NodeJS.SignalsListener & NodeJS.BeforeExitListener} */
  const shutdown = code => {
    const sig = typeof code === 'string' && code.startsWith('SIG');
    if (sig) {
      process.exitCode = 99;
    }
    if (shuttingDown) {
      process.exit();
    }
    shuttingDown = true;
    console.error('Shutting down cleanly...');
    const shutdowners = [...shutdownThunks.keys()];
    shutdownThunks.clear();
    Promise.allSettled([...shutdowners].map(t => Promise.resolve().then(t)))
      .then(statuses => {
        for (const status of statuses) {
          if (status.status === 'rejected') {
            console.warn(status.reason);
          }
        }
        console.log('Process terminated!');
      })
      .catch(error => console.warn('Error shutting down', error))
      .finally(() => {
        process.exit();
      });
  };

  // gracefully shut down the thunks on process exit
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGQUIT', shutdown);
  process.on('beforeExit', shutdown);

  return {
    registerShutdown: thunk => {
      shutdownThunks.add(thunk);
      return () => {
        shutdownThunks.delete(thunk);
      };
    },
  };
};

let cachedShutdown = null;
export const makeCachedShutdown = () => {
  if (!cachedShutdown) {
    cachedShutdown = makeFreshShutdown();
  }
  return cachedShutdown;
};

export { makeCachedShutdown as makeShutdown };
