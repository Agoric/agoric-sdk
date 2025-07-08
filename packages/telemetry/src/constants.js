export const SLOG_TYPES = {
  CLIST: 'clist',
  CONSOLE: 'console',
  COSMIC_SWINGSET: {
    AFTER_COMMIT_STATS: 'cosmic-swingset-after-commit-stats',
    BEGIN_BLOCK: 'cosmic-swingset-begin-block',
    BOOTSTRAP_BLOCK: {
      FINISH: 'cosmic-swingset-bootstrap-block-finish',
      START: 'cosmic-swingset-bootstrap-block-start',
    },
    COMMIT: {
      FINISH: 'cosmic-swingset-commit-block-finish',
      START: 'cosmic-swingset-commit-block-start',
    },
    END_BLOCK: {
      FINISH: 'cosmic-swingset-end-block-finish',
      START: 'cosmic-swingset-end-block-start',
    },
    INIT: 'cosmic-swingset-init',
    // eslint-disable-next-line no-restricted-syntax
    RUN: {
      FINISH: 'cosmic-swingset-run-finish',
      START: 'cosmic-swingset-run-start',
    },
    UPGRADE: {
      FINISH: 'cosmic-swingset-upgrade-finish',
      START: 'cosmic-swingset-upgrade-start',
    },
  },
  COSMIC_SWINGSET_TRIGGERS: {
    BRIDGE_INBOUND: 'cosmic-swingset-bridge-inbound',
    DELIVER_INBOUND: 'cosmic-swingset-deliver-inbound',
    INSTALL_BUNDLE: 'cosmic-swingset-install-bundle',
    TIMER_POLL: 'cosmic-swingset-timer-poll',
  },
  CRANK: {
    FINISH: 'crank-finish',
    START: 'crank-start',
  },
  DELIVER: 'deliver',
  DELIVER_RESULT: 'deliver-result',
  KERNEL: {
    INIT: {
      FINISH: 'kernel-init-finish',
      START: 'kernel-init-start',
    },
    STATS: 'kernel-stats',
  },
  REPLAY: {
    FINISH: 'finish-replay',
    START: 'start-replay',
  },
  SNAPSHOT: {
    SAVE: 'heap-snapshot-save',
  },
  SYSCALL: 'syscall',
  SYSCALL_RESULT: 'syscall-result',
  VAT: {
    STARTUP: {
      FINISH: 'vat-startup-finish',
      START: 'vat-startup-start',
    },
  },
};
