// @ts-check
import { makeTracer } from '@agoric/internal';

const trace = makeTracer('DeleteCompletedStakes');

/**
 * @param {import('@agoric/vats').AdminVat} vatAdmin
 * @param {import('@agoric/vats').TimerService} timer
 * @param {import('@agoric/vats').NameHub} namesByAddressAdmin
 * @param {import('@agoric/vats').NameHub} agoricNames
 * @param {import('@agoric/vats').NameHub} board
 */
export const cleanupCompletedStakes = async (
  vatAdmin,
  timer,
  namesByAddressAdmin,
  agoricNames,
  board,
) => {
  trace('Starting cleanup of completed stakes');
  
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
  if (elysFacet.cleanupCompletedStakes) {
    trace('Calling cleanupCompletedStakes');
    await elysFacet.cleanupCompletedStakes();
    trace('Completed stakes cleanup finished');
  } else {
    trace('cleanupCompletedStakes method not found on elys public facet');
  }
};

harden(cleanupCompletedStakes);
