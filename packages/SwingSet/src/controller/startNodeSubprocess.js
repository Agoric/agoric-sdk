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
      args.push('--cpu-prof');
      args.push('--cpu-prof-interval');
      args.push('100');
      args.push('--cpu-prof-name');
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
