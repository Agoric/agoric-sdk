import '@endo/init/debug.js';

import {
  availableRunUtilsSnapshotNames,
  computeRunUtilsSnapshotFingerprint,
  computeRunUtilsSnapshotFingerprints,
  computeRunUtilsSnapshotsFingerprint,
  createRunUtilsSnapshot,
  isRunUtilsSnapshotName,
  loadRunUtilsSnapshot,
} from './runutils-snapshots.js';

const usage = () => {
  const names = availableRunUtilsSnapshotNames().join(', ');
  console.error(
    `Usage: create-runutils-snapshot <name|--all|--cache-key [name]|--cache-keys|--check name>\nAvailable names: ${names}`,
  );
};

const main = async () => {
  const [command, arg] = process.argv.slice(2);
  const name = command;
  if (!name || name === '--help' || name === '-h') {
    usage();
    process.exitCode = 1;
    return;
  }
  if (name === '--list') {
    for (const snapshotName of availableRunUtilsSnapshotNames()) {
      console.log(snapshotName);
    }
    return;
  }
  if (name === '--cache-key') {
    if (arg) {
      if (!isRunUtilsSnapshotName(arg)) {
        console.error(`Unknown snapshot name: ${arg}`);
        usage();
        process.exitCode = 1;
        return;
      }
      console.log(await computeRunUtilsSnapshotFingerprint(arg));
      return;
    }
    console.log(await computeRunUtilsSnapshotsFingerprint());
    return;
  }
  if (name === '--cache-keys') {
    console.log(JSON.stringify(await computeRunUtilsSnapshotFingerprints()));
    return;
  }
  if (name === '--check') {
    if (!arg || !isRunUtilsSnapshotName(arg)) {
      console.error(`Unknown snapshot name: ${arg}`);
      usage();
      process.exitCode = 1;
      return;
    }
    try {
      await loadRunUtilsSnapshot(arg);
    } catch (err) {
      console.error(String(err));
      process.exitCode = 1;
    }
    return;
  }
  if (name === '--all') {
    for (const snapshotName of availableRunUtilsSnapshotNames()) {
      const path = await createRunUtilsSnapshot(snapshotName);
      console.log(`Wrote snapshot ${snapshotName} to ${path}`);
    }
    return;
  }
  if (!isRunUtilsSnapshotName(name)) {
    console.error(`Unknown snapshot name: ${name}`);
    usage();
    process.exitCode = 1;
    return;
  }
  const path = await createRunUtilsSnapshot(name);
  console.log(`Wrote snapshot ${name} to ${path}`);
};

await main();
