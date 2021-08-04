'use strict';

const { freeze } = Object;

/**
 * Tame XS's deep freeze by ignoring any additional arguments.
 *
 * @param {unknown} o
 */
Object.freeze = o => freeze(o);
