import process from 'process';

export function makeStartSubprocessWorkerNode(startSubprocessWorker) {
  // launch a worker in a subprocess (which runs Node.js)
  function startSubprocessWorkerNode(nameDisplayArg, nodeOptions) {
    const supervisorCodePath = new URL(
      '../supervisors/subprocess-node/supervisor-subprocess-node.js',
      import.meta.url,
    ).pathname;
    const args = [
      '--jitless',
      '--noexpose_wasm',
      '--gc-global',
      '--single-threaded-gc',
      ...(nodeOptions || []),
    ];
    args.push(supervisorCodePath);
    args.push(nameDisplayArg);
    return startSubprocessWorker(process.execPath, args);
  }

  return startSubprocessWorkerNode;
}
