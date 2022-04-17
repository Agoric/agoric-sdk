import process from 'process';

let unhandledRejectionHandler;

export function handleUnhandledRejections(handler) {
  unhandledRejectionHandler = handler;
}

process.on('unhandledRejection', rej => unhandledRejectionHandler(rej));
