// @ts-check
// import { M } from '@agoric/vat-data';
// eslint-disable-next-line import/no-extraneous-dependencies
import { passStyleOf, getTag } from '@endo/pass-style';
// XXX how to use devDependencies from tests/tools??
// eslint-disable-next-line import/no-extraneous-dependencies
import { Type } from '@sinclair/typebox';

// import * as fsAmbient from 'fs/promises';

/**
 * @file Generate JSON schema for editing config files
 * based on endo patterns
 */

// why is kindOf not exported?!
// https://github.com/endojs/endo/blob/53973bddbf73f681640ed9b7dd7bafdc2f8a3126/packages/patterns/src/patterns/patternMatchers.js#L219
const kindOf = patt => {
  const passStyle = passStyleOf(patt);
  if (passStyle !== 'tagged') return passStyle;
  return getTag(patt);
};

const { entries, fromEntries } = Object;

/**
 * @param {Pattern} pattern
 */
export const toTypeBox = pattern => {
  const todo = (...stuff) => {
    console.error(...stuff);
    throw Error(`not implemented`);
  };
  /**
   * @param {Pattern} patt
   * @returns {import('@sinclair/typebox').TSchema}
   */
  const recur = patt => {
    const pattKind = kindOf(patt);
    switch (pattKind) {
      case 'string':
        return Type.Literal(patt);
      case 'copyRecord': {
        return Type.Object(
          fromEntries(
            entries(patt).map(([prop, valPat]) => [prop, recur(valPat)]),
          ),
        );
      }
      case 'match:any': {
        return Type.Any();
      }
      case 'match:string': {
        const [limits] = patt.payload;
        if (limits) todo(limits);
        return Type.String();
      }
      case 'match:and': {
        const patts = patt.payload;
        return Type.Intersect(patts.map(recur));
      }
      case 'match:or': {
        const patts = patt.payload;
        return Type.Union(patts.map(recur));
      }
      case 'match:arrayOf': {
        const [subPatt, limits] = patt.payload;
        if (limits) todo(limits);
        return Type.Array(recur(subPatt));
      }
      case 'match:recordOf': {
        const [keyPatt, valuePatt] = patt.payload;
        // XXX Type.Record requires Type.String()
        return Type.Record(recur(keyPatt), recur(valuePatt));
      }
      case 'match:splitRecord': {
        const [required, optional] = patt.payload;
        const ty = recur(required);
        return optional
          ? Type.Composite([ty, Type.Partial(recur(optional))])
          : ty;
      }
      case 'match:kind': {
        const valueKind = patt.payload;
        switch (valueKind) {
          case 'boolean':
            return Type.Boolean();
          case 'number':
            return Type.Number();
          case 'string':
            return Type.String();
          default:
            console.error('@@@', pattKind, patt);
            throw Error(`unrecognized value kind: ${pattKind}`);
        }
      }
      default:
        console.error('@@@', pattKind, patt);
        throw Error(`unrecognized pattern kind: ${pattKind}`);
    }
  };
  return recur(pattern);
};
