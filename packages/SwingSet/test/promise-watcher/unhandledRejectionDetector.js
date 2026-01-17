import process from 'process';

let unhandledRejectionHandler;

export function handleUnhandledRejections(handler) {
  unhandledRejectionHandler = handler;
}

process.on('unhandledRejection', rej => {
  if (unhandledRejectionHandler) {
    unhandledRejectionHandler(rej);
  }
  // Prevent Ava 6 from exiting the process on unhandled rejection
  // when we're intentionally testing unhandled rejections
});
