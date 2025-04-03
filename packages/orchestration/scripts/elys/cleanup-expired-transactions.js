// @ts-check
import { makeTracer } from '@agoric/internal';

const trace = makeTracer('CleanupExpiredTransactions');

/**
 * @param {import('@agoric/vats').AdminVat} vatAdmin
 * @param {import('@agoric/vats').TimerService} timer
 * @param {import('@agoric/vats').NameHub} namesByAddressAdmin
 * @param {import('@agoric/vats').NameHub} agoricNames
 * @param {import('@agoric/vats').NameHub} board
 */
export const cleanupExpiredTransactions = async (
  vatAdmin,
  timer,
  namesByAddressAdmin,
  agoricNames,
  board,
) => {
  trace('Starting cleanup of expired transactions');
  
  // Get the elys instance
  const elysInstance = await agoricNames.lookup('instance', 'elys');
  if (!elysInstance) {
    trace('No elys instance found');
    return;
  }
  
  // Get the elys public facet
  const elysFacet = await agoricNames.lookup('elys', 'public');
  if (!elysFacet) {
    trace('No elys public facet found');
    return;
  }
  
  // Call the cleanup method if it exists
  if (elysFacet.cleanupExpiredTransactions) {
    trace('Calling cleanupExpiredTransactions');
    await elysFacet.cleanupExpiredTransactions();
    trace('Expired transactions cleanup finished');
  } else {
    trace('cleanupExpiredTransactions method not found on elys public facet');
  }
};

harden(cleanupExpiredTransactions);
