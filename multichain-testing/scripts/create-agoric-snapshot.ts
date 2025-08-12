#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * Create an Agoric snapshot from a running pod, copy it locally, then delete the namespace.
 */
import { $ } from 'execa';
import { resolve } from 'path';
import { existsSync, writeFileSync } from 'fs';

const main = async () => {
  const POD_NAME   = process.env.POD_NAME   || 'agoriclocal-genesis-0';
  const CONTAINER  = process.env.CONTAINER  || 'exposer';
  const NAMESPACE  = process.env.NAMESPACE  || 'starship-testing';
  const SNAP_NAME  = process.env.SNAPSHOT_NAME || 'agoric-snapshot.tar.gz';

  const remoteDir  = '/root/.agoric';
  const remoteFile = `${remoteDir}/${SNAP_NAME}`;
  const localFile  = resolve(process.cwd(), SNAP_NAME);

  console.log(`Using:
  - NAMESPACE : ${NAMESPACE}
  - POD_NAME  : ${POD_NAME}
  - CONTAINER : ${CONTAINER}
  - SNAP_NAME : ${SNAP_NAME}`);

  // 1) Create tarball inside the container
  console.log('> Creating snapshot tarball inside the container...');
  await $`kubectl exec -i ${POD_NAME} -c ${CONTAINER} -n ${NAMESPACE} -- sh -c cd ${remoteDir} && tar czf ${SNAP_NAME} config data keyring-test`;


  // 2) Copy it locally
  console.log(`> Copying snapshot to local path: ${localFile}`);
  // kubectl cp requires -c for non-default container
  await $`kubectl cp -n ${NAMESPACE} -c ${CONTAINER} ${NAMESPACE}/${POD_NAME}:${remoteFile} ${localFile}`;

  if (!existsSync(localFile)) {
    writeFileSync(localFile, '');
  }
  console.log('> Snapshot copied successfully.');

//   // 3) Delete the namespace
//   console.log(`> Deleting namespace ${NAMESPACE}...`);
//   // --wait=false so the command returns immediately
//   await $`kubectl delete namespace ${NAMESPACE} --wait=false`;
//   console.log('> Namespace delete requested.');

//   console.log('\nDone.\nSummary:');
//   console.log(`  - Snapshot file: ${localFile}`);
//   console.log(`  - Namespace ${NAMESPACE} delete initiated.`);
};

main().catch((error) => {
  console.error('An error occurred:', error);
  process.exit(1);
});
