// @ts-check
import fs from 'fs';
import { E } from '@agoric/eventual-send';

// This script takes our contract code, installs it on Zoe, and makes
// the installation publicly available. Our backend API script will
// use this installation in a later step.

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

/**
 *
 * @param {*} _homePromise
 * @param {DeployPowers} _powers
 */
export default async function deployContract(_homePromise, _powers) {
  // TODO
}
