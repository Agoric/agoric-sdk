import { Buffer } from 'buffer';
import { makeB0ID } from './util.js';

export const snapshotData = 'snapshot data';
// this snapHash was computed manually
export const snapHash =
  'e7dee7266896538616b630a5da40a90e007726a383e005a9c9c5dd0c2daf9329';

/** @type {import('../src/bundleStore.js').Bundle} */
export const bundle0 = { moduleFormat: 'nestedEvaluate', source: '1+1' };
export const bundle0ID = makeB0ID(bundle0);

export function buildData() {
  // build an export manually
  const exportData = new Map();
  const artifacts = new Map();

  // shadow kvStore
  exportData.set('kv.key1', 'value1');

  // now add artifacts and metadata in pairs

  artifacts.set(`bundle.${bundle0ID}`, JSON.stringify(bundle0));
  exportData.set(`bundle.${bundle0ID}`, bundle0ID);

  const sbase = { vatID: 'v1', hash: snapHash, inUse: 0 };
  const tbase = { vatID: 'v1', startPos: 0, isCurrent: 0, incarnation: 1 };
  const addTS = (key, obj) =>
    exportData.set(key, JSON.stringify({ ...tbase, ...obj }));
  const t0hash =
    '5bee0f44eca02f23eab03703e84ed2647d5d117fed99e1c30a3b424b7f082ab9';
  const t2hash =
    '57152efdd7fdf75c03371d2b4f1088d5bf3eae7fe643babce527ff81df38998c';
  const t5hash =
    '1947001e78e01bd1e773feb22b4ffc530447373b9de9274d5d5fbda3f23dbf2b';
  const t8hash =
    'e6b42c6a3fb94285a93162f25a9fc0145fd4c5bb144917dc572c50ae2d02ee69';

  addTS(`transcript.v1.0`, { incarnation: 0, endPos: 2, hash: t0hash });
  artifacts.set(`transcript.v1.0.2`, 'start-worker\nshutdown-worker\n');

  addTS(`transcript.v1.2`, { startPos: 2, endPos: 5, hash: t2hash });
  artifacts.set(
    `transcript.v1.2.5`,
    'start-worker\ndelivery1\nsave-snapshot\n',
  );
  exportData.set(`snapshot.v1.4`, JSON.stringify({ ...sbase, snapPos: 4 }));
  artifacts.set(`snapshot.v1.4`, snapshotData);

  addTS(`transcript.v1.5`, { startPos: 5, endPos: 8, hash: t5hash });
  artifacts.set(
    'transcript.v1.5.8',
    'load-snapshot\ndelivery2\nsave-snapshot\n',
  );
  exportData.set(
    `snapshot.v1.7`,
    JSON.stringify({ ...sbase, snapPos: 7, inUse: 1 }),
  );
  artifacts.set(`snapshot.v1.7`, snapshotData);

  artifacts.set('transcript.v1.8.10', 'load-snapshot\ndelivery3\n');
  exportData.set(`snapshot.v1.current`, 'snapshot.v1.7');
  addTS(`transcript.v1.current`, {
    startPos: 8,
    endPos: 10,
    isCurrent: 1,
    hash: t8hash,
  });

  return { exportData, artifacts, t0hash, t2hash, t5hash, t8hash };
}

/**
 * @param { Map<string, string | null> } exportData
 * @param { Map<string, string> } artifacts
 */
export function makeExporter(exportData, artifacts) {
  return {
    getHostKV(_key) {
      return undefined;
    },
    async *getExportData() {
      for (const [key, value] of exportData.entries()) {
        /** @type { import('../src/exporter.js').KVPair } */
        const pair = [key, value];
        yield pair;
      }
    },
    async *getArtifactNames() {
      for (const name of artifacts.keys()) {
        yield name;
      }
    },
    async *getArtifact(name) {
      const data = artifacts.get(name);
      assert(data, `missing artifact ${name}`);
      yield Buffer.from(data);
    },
    // eslint-disable-next-line no-empty-function
    async close() {},
  };
}
