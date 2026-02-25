import * as fsAmbient from 'node:fs';
import * as fspAmbient from 'node:fs/promises';
import * as osAmbient from 'node:os';
import * as pathAmbient from 'node:path';
import {
  makeFileRd as makeFileRdCore,
  makeFileRW as makeFileRWCore,
  makeFileRWResolve as makeFileRWResolveCore,
} from '../file.js';

export const makeFileRd = (root, io = {}) =>
  makeFileRdCore(root, {
    fs: fsAmbient,
    fsp: fspAmbient,
    path: pathAmbient,
    ...io,
  });

export const makeFileRW = (root, io = {}) =>
  makeFileRWCore(root, {
    fs: fsAmbient,
    fsp: fspAmbient,
    path: pathAmbient,
    ...io,
  });

export const makeFileRWResolve = (root, io = {}) =>
  makeFileRWResolveCore(root, {
    fs: fsAmbient,
    fsp: fspAmbient,
    path: pathAmbient,
    ...io,
  });

export const makeTempDir = (io = {}) =>
  makeFileRWResolveCore(osAmbient.tmpdir(), {
    fs: fsAmbient,
    fsp: fspAmbient,
    path: pathAmbient,
    ...io,
  });
