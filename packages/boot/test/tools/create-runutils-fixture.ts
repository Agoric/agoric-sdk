import '@endo/init/debug.js';

import {
  availableRunUtilsFixtureNames,
  createRunUtilsFixture,
  isRunUtilsFixtureName,
} from './runutils-fixtures.js';

const usage = () => {
  const names = availableRunUtilsFixtureNames().join(', ');
  console.error(
    `Usage: create-runutils-fixture <name>\nAvailable names: ${names}`,
  );
};

const main = async () => {
  const [name] = process.argv.slice(2);
  if (!name || name === '--help' || name === '-h') {
    usage();
    process.exitCode = 1;
    return;
  }
  if (name === '--list') {
    for (const fixtureName of availableRunUtilsFixtureNames()) {
      console.log(fixtureName);
    }
    return;
  }
  if (!isRunUtilsFixtureName(name)) {
    console.error(`Unknown fixture name: ${name}`);
    usage();
    process.exitCode = 1;
    return;
  }
  const path = await createRunUtilsFixture(name);
  console.log(`Wrote fixture ${name} to ${path}`);
};

await main();
