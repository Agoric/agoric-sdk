import { Far } from '@endo/marshal';
import { initEmpty } from '@agoric/store';
import { defineKindMulti } from '@agoric/vat-data';

export function buildRootObject(vatPowers) {
  const { testLog } = vatPowers;

  let extracted;

  const makeThing = defineKindMulti('thing', initEmpty, {
    regularFacet: {
      statelessMethod: () => 0,
      extractState: ({ state }) => {
        extracted = state;
      },
      extractCohort: ({ facets }) => {
        extracted = facets;
      },
    },
    emptyFacet: {},
  });

  let strongRetainer;
  const weakRetainer = new WeakSet();
  let retentionMode;

  return Far('root', {
    retain(mode) {
      retentionMode = mode;
      const { regularFacet, emptyFacet } = makeThing();
      const originalFacet = mode.endsWith('empty') ? emptyFacet : regularFacet;
      switch (mode) {
        case 'facet':
        case 'empty':
          strongRetainer = originalFacet;
          break;
        case 'wfacet':
        case 'wempty':
          weakRetainer.add(originalFacet);
          break;
        case 'method':
          strongRetainer = originalFacet.statelessMethod;
          break;
        case 'wmethod':
          weakRetainer.add(originalFacet.statelessMethod);
          break;
        case 'proto':
          // eslint-disable-next-line no-proto
          strongRetainer = originalFacet.__proto__;
          break;
        case 'wproto':
          // eslint-disable-next-line no-proto
          weakRetainer.add(originalFacet.__proto__);
          break;
        case 'cohort':
          originalFacet.extractCohort();
          strongRetainer = extracted;
          extracted = null;
          break;
        case 'wcohort':
          originalFacet.extractCohort();
          weakRetainer.add(extracted);
          extracted = null;
          break;
        case 'state':
          originalFacet.extractState();
          strongRetainer = extracted;
          extracted = null;
          break;
        case 'wstate':
          originalFacet.extractState();
          weakRetainer.add(extracted);
          extracted = null;
          break;
        default:
          console.log(`retain: unknown mode ${mode}`);
          break;
      }
      makeThing(); // push original out of the cache
      return originalFacet;
    },
    testForRetention(facet) {
      let compare;
      switch (retentionMode) {
        case 'facet':
        case 'empty':
          compare = strongRetainer === facet;
          break;
        case 'wfacet':
        case 'wempty':
          compare = weakRetainer.has(facet);
          break;
        case 'method':
          compare = strongRetainer === facet.statelessMethod;
          break;
        case 'wmethod':
          compare = weakRetainer.has(facet.statelessMethod);
          break;
        case 'proto':
          // eslint-disable-next-line no-proto
          compare = strongRetainer === facet.__proto__;
          break;
        case 'wproto':
          // eslint-disable-next-line no-proto
          compare = weakRetainer.has(facet.__proto__);
          break;
        case 'cohort':
          facet.extractCohort();
          compare = strongRetainer === extracted;
          break;
        case 'wcohort':
          facet.extractCohort();
          compare = weakRetainer.has(extracted);
          break;
        case 'state':
          facet.extractState();
          compare = strongRetainer === extracted;
          break;
        case 'wstate':
          facet.extractState();
          compare = weakRetainer.has(extracted);
          break;
        default:
          console.log(`testForRetention: unknown mode ${retentionMode}`);
          break;
      }
      testLog(`compare old === new : ${compare}`);
    },
  });
}
