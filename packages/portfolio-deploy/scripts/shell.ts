import { execa } from 'execa';

export async function execCmd(cmd: string, opts: { input?: string } = {}) {
  const subprocess = execa(cmd, {
    shell: true,
    input: opts.input ?? undefined,
  });

  const { stdout } = await subprocess;
  return stdout;
}

export async function checkPodsRunning(): Promise<boolean> {
  const { stdout } = await execa('kubectl get pods', { shell: true });
  const expectedPods = [
    'agoriclocal-genesis-0',
    'hermes-agoric-noble-0',
    'noblelocal-genesis-0',
    'registry',
  ];

  return expectedPods.every(
    podName => stdout.includes(podName) && stdout.includes('Running'),
  );
}
