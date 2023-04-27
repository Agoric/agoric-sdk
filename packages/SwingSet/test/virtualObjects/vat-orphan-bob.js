import { Far } from '@endo/far';
import { initEmpty } from '@agoric/store';
import { defineKind, defineKindMulti } from '@agoric/vat-data';

const { getPrototypeOf } = Object;

function extract({ thing, regularFacet, emptyFacet }, kind, what) {
  if (kind === 'single') {
    switch (what) {
      case 'self':
        return thing.extractSelf();
      case 'facet':
        return thing;
      case 'method':
        return thing.statelessMethod;
      case 'proto':
        return getPrototypeOf(thing);
      case 'context':
        return thing.extractContext();
      case 'state':
        return thing.extractState();
      default:
        throw Error(`unknown piece in ${what}`);
    }
  } else if (kind === 'multi') {
    switch (what) {
      case 'cohort':
        return regularFacet.extractCohort();
      case 'empty':
        return emptyFacet;
      case 'facet':
        return regularFacet;
      case 'method':
        return regularFacet.statelessMethod;
      case 'proto':
        return getPrototypeOf(regularFacet);
      case 'context':
        return regularFacet.extractContext();
      case 'state':
        return regularFacet.extractState();
      default:
        throw Error(`unknown piece in ${what}`);
    }
  } else {
    throw Error(`unknown kind in ${what}`);
  }
}

export function buildRootObject() {
  const makeThing = defineKind('thing', initEmpty, {
    statelessMethod: () => 0,
    extractState: ({ state }) => state,
    extractSelf: ({ self }) => self,
    extractContext: context => context,
  });

  const makeMultiThing = defineKindMulti('multithing', initEmpty, {
    regularFacet: {
      statelessMethod: () => 0,
      extractState: ({ state }) => state,
      extractCohort: ({ facets }) => facets,
      extractContext: context => context,
    },
    emptyFacet: {},
  });

  let strongRetainer;
  let weakRetainer;

  function reset() {
    strongRetainer = null;
    weakRetainer = new WeakSet();
  }

  reset();

  return Far('root', {
    reset,
    retain(kind, what, how) {
      const thing = makeThing();
      const { regularFacet, emptyFacet } = makeMultiThing();
      const things = { thing, regularFacet, emptyFacet };

      const hold = extract(things, kind, what);
      switch (how) {
        case 'retain':
          strongRetainer = hold;
          break;
        case 'weakset':
          weakRetainer.add(hold);
          break;
        default:
          throw Error(`unknown how ${how}`);
      }
      return things;
    },

    compare(things, kind, what, how) {
      const sample = extract(things, kind, what);
      switch (how) {
        case 'retain':
          return strongRetainer === sample;
        case 'weakset':
          return weakRetainer.has(sample);
        default:
          throw Error(`unknown how ${how}`);
      }
    },
  });
}
