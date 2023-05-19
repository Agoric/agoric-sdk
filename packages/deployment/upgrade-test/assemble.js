#!/usr/bin/env node
import fs from 'fs';
import { glob } from 'glob';
import crypto from 'crypto';
import child_process from 'child_process';
import process from 'process';
import os from 'os';

const config = JSON.parse(fs.readFileSync('./upgrades.json', 'utf8'));
let imageCache = {};

function imageExists(image, imageLabel) {
  if (process.env.NO_CACHE === true || process.arch === 'arm64') {
    return false;
  }
  if (imageCache[`${image}:${imageLabel}`]) {
    return imageCache[`${image}:${imageLabel}`];
  }
  try {
    child_process.execSync(
      `DOCKER_CLI_EXPERIMENTAL=enabled docker manifest inspect ghcr.io/${image}:${imageLabel}`,
      { timeout: 10000 },
    );
    console.log(`image found ghcr.io/${image}:${imageLabel}`);
    imageCache[`${image}:${imageLabel}`] = true;
    return true;
  } catch {
    console.log(`image not found ghcr.io/${image}:${imageLabel}`);
    imageCache[`${image}:${imageLabel}`] = false;
    return false;
  }
}
function hashFor(upgrades, index) {
  const filesContents = [
    fs.readFileSync('./upgrades.json', 'utf8'),
    fs.readFileSync('./assemble.js', 'utf8'),
    process.env.BOOTSTRAP_MODE || 'main',
  ];
  for (let i = 0; i <= index; i++) {
    const name = upgrades[i].name;
    filesContents.push(upgrades[i].image);
    if (upgrades[i].upgrade_to) {
      filesContents.push(upgrades[i].upgrade_to);
    }
    glob
      .sync('*.*', { cwd: `./upgrade-test-scripts/${name}/`, sort: true })
      .forEach(f => {
        const fn = `./upgrade-test-scripts/${name}/${f}`;
        const contents = fs.readFileSync(fn, 'utf8');
        filesContents.push(fn, contents);
      });

    glob
      .sync('*.sh', { cwd: `./upgrade-test-scripts/`, sort: true })
      .forEach(f => {
        const fn = `./upgrade-test-scripts/${f}`;
        const contents = fs.readFileSync(fn, 'utf8');
        filesContents.push(fn, contents);
      });
  }
  return crypto
    .createHash('sha256')
    .update(filesContents.join('\n'))
    .digest('hex');
}

function printDocker() {
  const buf = [];
  for (let i = 0; i < config.upgrades.length; i++) {
    const upgrade = config.upgrades[i];
    buf.push(`# this is ${upgrade.name}`);
    const contextHash = hashFor(config.upgrades, i);
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `${upgrade.name}_hash=ctx-${contextHash}\n`,
      );
    }
    console.log(`# ${upgrade.name} hash: ctx-${contextHash}`);
    buf.push(`# Computed hash: ${contextHash}`);
    if (upgrade.upgrade_to)
      buf.push(`# with a governance upgrade to ${upgrade.upgrade_to}`);

    if (
      upgrade.cacheable === true &&
      imageExists('agoric/agoric-upgrade-test', `ctx-${contextHash}`)
    ) {
      // use a layer cache
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(
          process.env.GITHUB_OUTPUT,
          `${upgrade.name}_skipbuild=1\n`,
        );
      }
      console.log(`${upgrade.name}_skipbuild=1`);
      if (
        i + 1 < config.upgrades.length &&
        config.upgrades[i + 1].cacheable === true &&
        imageExists(
          'agoric/agoric-upgrade-test',
          `ctx-${hashFor(config.upgrades, i + 1)}`,
        )
      ) {
        continue;
      }
      buf.push(
        `FROM ghcr.io/agoric/agoric-upgrade-test:ctx-${contextHash} as ${upgrade.name}-pre`,
      );
    } else {
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(
          process.env.GITHUB_OUTPUT,
          `${upgrade.name}_skipbuild=0\n`,
        );
      }
      console.log(`${upgrade.name}_skipbuild=0`);

      buf.push(`FROM ${upgrade.image} as ${upgrade.name}-pre`);
      if (upgrade.upgrade_to) buf.push(`ENV UPGRADE_TO=${upgrade.upgrade_to}`);

      buf.push(
        `ENV THIS_NAME=${upgrade.name}`,
        `ENV BOOTSTRAP_MODE=${process.env.BOOTSTRAP_MODE || 'main'}`,
        'RUN mkdir -p /usr/src/agoric-sdk/upgrade-test-scripts',
        'WORKDIR /usr/src/agoric-sdk/',
        'COPY ./*.sh ./upgrade-test-scripts/',
      );
      if (upgrade.image !== 'ghcr.io/agoric/ag0:agoric-upgrade-7-2' && i > 0) {
        buf.push(`COPY ./\${THIS_NAME} ./upgrade-test-scripts/\${THIS_NAME}/`);
        buf.push(
          `COPY --from=${
            config.upgrades[i - 1].name
          } /root/.agoric /root/.agoric`,
        );
      }

      buf.push(
        'SHELL ["/bin/bash", "-c"]',
        'RUN chmod +x ./upgrade-test-scripts/*.sh',
        `RUN . ./upgrade-test-scripts/start_${i === 0 ? 'ag0' : 'to_to'}.sh`,
      );
    }

    buf.push(
      `FROM ${upgrade.image} as ${upgrade.name}`,
      `COPY --from=${upgrade.name}-pre /root/.agoric /root/.agoric`,
    );
    if (i > 0) {
      buf.push(
        `COPY --from=${upgrade.name}-pre /usr/src/agoric-sdk/upgrade-test-scripts /usr/src/agoric-sdk/upgrade-test-scripts`,
      );
    }

    if (i === config.upgrades.length - 1) {
      buf.push(
        `ENV DEST=1`,
        `ENTRYPOINT /usr/src/agoric-sdk/upgrade-test-scripts/start_to_to.sh`,
      );
    }
    buf.push();
  }
  return buf.join('\n');
}

try {
  fs.writeFileSync('Dockerfile.assembled', printDocker());
  console.log('Dockerfile.assembled written');
} catch (err) {
  console.error(err);
}
