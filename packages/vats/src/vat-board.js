// @ts-check
import { provide } from '@agoric/vat-data';
import { Far } from '@endo/marshal';
import { prepareBoardKit } from './lib-board.js';

// There is only one board in this vat.
const THE_BOARD = 'theboard';

/**
 * @param {unknown} _vatPowers
 * @param {unknown} _vatParameters
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export function buildRootObject(_vatPowers, _vatParameters, baggage) {
  const makeBoardKit = prepareBoardKit(baggage);
  const { board } = provide(
    baggage,
    THE_BOARD,
    // XXX provide() type assumes the maker takes the key as its first argument
    () => makeBoardKit(),
  );
  return Far('vat-board', { getBoard: () => board });
}
