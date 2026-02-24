/* eslint-disable */
// AVA preload diagnostics for flaky CI failures.
// Enabled in CI by default; can also be forced with AGORIC_AVA_PROCESS_DIAG=1.
import process from 'node:process';
import { isMainThread, threadId } from 'node:worker_threads';

const enabled =
  process.env.AGORIC_AVA_PROCESS_DIAG === '1' || process.env.GITHUB_ACTIONS;

if (!enabled) {
  // Keep local output clean unless explicitly enabled.
} else {
  const prefix = '[ava-diag]';
  const who = `pid=${process.pid} ppid=${process.ppid} thread=${threadId} mainThread=${isMainThread}`;

  const safeJson = value => {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const countActiveHandles = () => {
    try {
      // @ts-expect-error Node internal API, used only for CI diagnostics.
      return process._getActiveHandles().length;
    } catch {
      return 'unknown';
    }
  };

  const log = (msg, extra) => {
    const parts = [
      prefix,
      new Date().toISOString(),
      who,
      msg,
      `activeHandles=${countActiveHandles()}`,
    ];
    if (extra !== undefined) {
      parts.push(typeof extra === 'string' ? extra : safeJson(extra));
    }
    console.error(parts.join(' | '));
  };

  log('startup', {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    argv: process.argv,
    execArgv: process.execArgv,
  });

  process.once('exit', code => {
    log(`exit code=${code}`);
  });
  process.once('disconnect', () => {
    log('disconnect');
  });
  process.once('uncaughtException', err => {
    log('uncaughtException', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });
  });
  process.once('unhandledRejection', reason => {
    log('unhandledRejection', reason);
  });
  process.on('warning', warning => {
    log('warning', {
      name: warning?.name,
      message: warning?.message,
      stack: warning?.stack,
    });
  });

  const signals = [
    'SIGHUP',
    'SIGINT',
    'SIGTERM',
    'SIGQUIT',
    'SIGUSR1',
    'SIGUSR2',
  ];
  for (const signal of signals) {
    process.on(signal, () => {
      log(`signal ${signal}`);
    });
  }
}
