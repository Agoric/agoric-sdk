import process from 'process';

export function makeStartSubprocessWorkerNode(
  startSubprocessWorker,
  profileVats,
  debugVats,
) {
  // launch a worker in a subprocess (which runs Node.js)
  function startSubprocessWorkerNode(nameDisplayArg, vatID, nodeOptions) {
    const supervisorCodePath = new URL(
      '../supervisors/subprocess-node/supervisor-subprocess-node.js',
      import.meta.url,
    ).pathname;
    const args = nodeOptions ? [...nodeOptions] : [];
    if (profileVats.includes(vatID)) {
      // Enable profiling with a 1 microsecond sampling interval,
      // saving results to a file in the working directory
      // with a portable name derived from the vat name
      // and in particular replacing any colons with dashes.
      // cf. ../kernel/vat-loader/manager-subprocess-node.js
      // https://github.com/Agoric/agoric-sdk/blob/18d561f1b95755e58ca691b26938fc249618018d/packages/SwingSet/src/kernel/vat-loader/manager-subprocess-node.js#L32-L34
      args.push('--cpu-prof');
      args.push('--cpu-prof-interval');
      args.push('1');
      args.push('--cpu-prof-name');
      // cf. https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap03.html#tag_03_282
      nameDisplayArg = nameDisplayArg
        .replaceAll(':', '-')
        .replaceAll(/[^a-z0-9._-]/gi, '_');
      args.push(`CPU.${nameDisplayArg}.cpuprofile`);
    }
    if (debugVats.includes(vatID)) {
      args.push('--inspect-brk');
    }
    args.push(supervisorCodePath);
    args.push(nameDisplayArg);
    return startSubprocessWorker(process.execPath, args);
  }

  return startSubprocessWorkerNode;
}
