// @ts-check
import test from 'ava';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(
  new URL('../../../.github/scripts/auto-retry-automerge.mts', import.meta.url),
);

/**
 * @param {string} command
 * @param {...string} args
 * @returns {unknown}
 */
const runSelfTest = (command, ...args) => {
  const stdout = execFileSync(scriptPath, ['--self-test', command, ...args], {
    encoding: 'utf8',
  });
  return JSON.parse(stdout.trim());
};

test('hasAutomergeLabel matches supported labels only', t => {
  t.true(
    runSelfTest(
      'hasAutomergeLabel',
      JSON.stringify([{ name: 'automerge:squash' }]),
    ),
  );
  t.true(
    runSelfTest(
      'hasAutomergeLabel',
      JSON.stringify([{ name: 'automerge:no-update' }]),
    ),
  );
  t.true(
    runSelfTest(
      'hasAutomergeLabel',
      JSON.stringify([{ name: 'automerge:rebase' }]),
    ),
  );
  t.false(
    runSelfTest(
      'hasAutomergeLabel',
      JSON.stringify([{ name: 'bypass:automerge' }]),
    ),
  );
  t.false(
    runSelfTest(
      'hasAutomergeLabel',
      JSON.stringify([{ name: 'force:integration' }]),
    ),
  );
});

test('isRetryableWorkflowRun allows up to 3 retries and stops at attempt 4', t => {
  const baseRun = {
    id: 1,
    name: 'Test all Packages',
    conclusion: 'failure',
    event: 'pull_request',
    run_attempt: 1,
    pull_requests: [{ number: 123 }],
  };
  const baseRunExpr = JSON.stringify(baseRun);

  t.true(runSelfTest('isRetryableWorkflowRun', baseRunExpr));
  t.true(
    runSelfTest(
      'isRetryableWorkflowRun',
      JSON.stringify({ ...baseRun, conclusion: 'timed_out' }),
    ),
  );
  t.false(
    runSelfTest(
      'isRetryableWorkflowRun',
      JSON.stringify({ ...baseRun, conclusion: 'cancelled' }),
    ),
  );
  t.false(
    runSelfTest(
      'isRetryableWorkflowRun',
      JSON.stringify({ ...baseRun, event: 'merge_group' }),
    ),
  );
  t.true(
    runSelfTest(
      'isRetryableWorkflowRun',
      JSON.stringify({ ...baseRun, run_attempt: 2 }),
    ),
  );
  t.true(
    runSelfTest(
      'isRetryableWorkflowRun',
      JSON.stringify({ ...baseRun, run_attempt: 3 }),
    ),
  );
  t.false(
    runSelfTest(
      'isRetryableWorkflowRun',
      JSON.stringify({ ...baseRun, run_attempt: 4 }),
    ),
  );
  t.false(
    runSelfTest(
      'isRetryableWorkflowRun',
      JSON.stringify({ ...baseRun, name: 'Some other workflow' }),
    ),
  );
  t.false(
    runSelfTest(
      'isRetryableWorkflowRun',
      JSON.stringify({ ...baseRun, pull_requests: [] }),
    ),
  );
});

test('selectLatestRetryableRuns keeps only newest failed run per monitored workflow on current SHA', t => {
  const headSha = 'abc123';
  const runs = [
    {
      id: 10,
      name: 'Test all Packages',
      head_sha: headSha,
      conclusion: 'failure',
      event: 'pull_request',
      run_attempt: 1,
      pull_requests: [{ number: 1 }],
      created_at: '2026-03-06T10:00:00Z',
    },
    {
      id: 11,
      name: 'Test all Packages',
      head_sha: headSha,
      conclusion: 'failure',
      event: 'pull_request',
      run_attempt: 1,
      pull_requests: [{ number: 1 }],
      created_at: '2026-03-06T10:05:00Z',
    },
    {
      id: 12,
      name: 'Integration tests',
      head_sha: headSha,
      conclusion: 'timed_out',
      event: 'pull_request',
      run_attempt: 1,
      pull_requests: [{ number: 1 }],
      created_at: '2026-03-06T10:06:00Z',
    },
    {
      id: 13,
      name: 'Test Golang',
      head_sha: headSha,
      conclusion: 'failure',
      event: 'pull_request',
      run_attempt: 4,
      pull_requests: [{ number: 1 }],
      created_at: '2026-03-06T10:07:00Z',
    },
    {
      id: 16,
      name: 'Test Golang',
      head_sha: headSha,
      conclusion: 'failure',
      event: 'pull_request',
      run_attempt: 2,
      pull_requests: [{ number: 1 }],
      created_at: '2026-03-06T10:07:30Z',
    },
    {
      id: 14,
      name: 'Test all Packages',
      head_sha: 'older',
      conclusion: 'failure',
      event: 'pull_request',
      run_attempt: 1,
      pull_requests: [{ number: 1 }],
      created_at: '2026-03-06T10:08:00Z',
    },
    {
      id: 15,
      name: 'Multichain E2E Tests',
      head_sha: headSha,
      conclusion: 'failure',
      event: 'workflow_dispatch',
      run_attempt: 1,
      pull_requests: [{ number: 1 }],
      created_at: '2026-03-06T10:09:00Z',
    },
  ];

  const retryRuns = /** @type {number[]} */ (
    runSelfTest(
      'selectLatestRetryableRuns',
      JSON.stringify(runs),
      JSON.stringify(headSha),
    )
  ).sort((a, b) => a - b);

  t.deepEqual(retryRuns, [11, 12, 16]);
});
