// @jessie-check

/**
 * These identify top-level paths for SwingSet chain storage (and serve as
 * prefixes). To avoid collisions, they should remain synchronized with
 * golang/cosmos/x/swingset/keeper/keeper.go
 */
export const ACTION_QUEUE = 'actionQueue';
export const HIGH_PRIORITY_QUEUE = 'highPriorityQueue';
export const HIGH_PRIORITY_SENDERS = 'highPrioritySenders';
export const BEANSOWING = 'beansOwing';
export const EGRESS = 'egress';
export const MAILBOX = 'mailbox';
export const BUNDLES = 'bundles';
export const CUSTOM = 'published';
export const SWING_STORE = 'swingStore';
