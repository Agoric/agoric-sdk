/* global __dirname */
import path from 'path';

export function replExpress(express, app) {
  // Install the REPL HTML server in an express app.
  const repldir = path.join(__dirname, '..', 'public');
  app.use(express.static(repldir));
}
