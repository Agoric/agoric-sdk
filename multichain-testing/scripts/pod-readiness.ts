import { execa } from 'execa';
import { sleep } from '../tools/sleep.ts';

const checkPodsReadiness = async (): Promise<boolean> => {
  const { stdout } = await execa('kubectl', ['get', 'pods']);
  console.clear();
  console.log('Current pod status:');
  console.log(stdout);

  const lines = stdout.split('\n').slice(1); // Skip the header line
  return (
    lines.length > 0 &&
    lines.every(line => {
      const [, ready] = line.split(/\s+/);
      const [readyCount, totalCount] = ready.split('/');
      return readyCount === totalCount;
    })
  );
};

const main = async () => {
  console.log('Starting pod readiness check...');
  for (;;) {
    const allReady = await checkPodsReadiness();
    if (allReady) {
      console.log('All pods are ready!');
      process.exit(0);
    }
    await sleep(2 * 1_000);
  }
};

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});
