// @ts-check
import test from 'ava';
import { execFileSync } from 'node:child_process';

const moduleUrl = new URL(
  '../../../.github/scripts/auto-retry-automerge.mts',
  import.meta.url,
).href;
const nodeMajor = Number(process.versions.node.split('.')[0] || 0);
const testNode22 = nodeMajor >= 22 ? test : test.skip;

/**
 * @param {string} expression
 * @returns {unknown}
 */
const evalModuleExpression = expression => {
  const stdout = execFileSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--input-type=module',
      '-e',
      `import * as mod from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify(${expression}));`,
    ],
    {
      encoding: 'utf8',
    },
  );
  return JSON.parse(stdout.trim());
};

testNode22('hasAutomergeLabel matches automerge and bypass labels only', t => {
  t.true(
    evalModuleExpression(
      `mod.hasAutomergeLabel([{ name: 'automerge:squash' }])`,
    ),
  );
  t.true(
    evalModuleExpression(
      `mod.hasAutomergeLabel([{ name: 'automerge:no-update' }])`,
    ),
  );
  t.true(
    evalModuleExpression(
      `mod.hasAutomergeLabel([{ name: 'automerge:rebase' }])`,
    ),
  );
  t.true(
    evalModuleExpression(
      `mod.hasAutomergeLabel([{ name: 'bypass:automerge' }])`,
    ),
  );
  t.false(
    evalModuleExpression(
      `mod.hasAutomergeLabel([{ name: 'force:integration' }])`,
    ),
  );
});

testNode22('isPendingWorkflowRun matches active rerun states', t => {
  t.true(
    evalModuleExpression(`mod.isPendingWorkflowRun({ status: 'queued' })`),
  );
  t.true(
    evalModuleExpression(`mod.isPendingWorkflowRun({ status: 'in_progress' })`),
  );
  t.true(
    evalModuleExpression(`mod.isPendingWorkflowRun({ status: 'requested' })`),
  );
  t.false(
    evalModuleExpression(
      `mod.isPendingWorkflowRun({ status: 'completed', conclusion: 'failure' })`,
    ),
  );
});

testNode22(
  'isRetryableWorkflowRun allows up to 3 retries and stops at attempt 4',
  t => {
    const baseRun = {
      id: 1,
      name: 'Test all Packages',
      conclusion: 'failure',
      event: 'pull_request',
      run_attempt: 1,
      pull_requests: [{ number: 123 }],
    };
    const baseRunExpr = JSON.stringify(baseRun);

    t.true(evalModuleExpression(`mod.isRetryableWorkflowRun(${baseRunExpr})`));
    t.true(
      evalModuleExpression(
        `mod.isRetryableWorkflowRun({ ...${baseRunExpr}, conclusion: 'timed_out' })`,
      ),
    );
    t.false(
      evalModuleExpression(
        `mod.isRetryableWorkflowRun({ ...${baseRunExpr}, conclusion: 'cancelled' })`,
      ),
    );
    t.false(
      evalModuleExpression(
        `mod.isRetryableWorkflowRun({ ...${baseRunExpr}, event: 'merge_group' })`,
      ),
    );
    t.true(
      evalModuleExpression(
        `mod.isRetryableWorkflowRun({ ...${baseRunExpr}, run_attempt: 2 })`,
      ),
    );
    t.true(
      evalModuleExpression(
        `mod.isRetryableWorkflowRun({ ...${baseRunExpr}, run_attempt: 3 })`,
      ),
    );
    t.false(
      evalModuleExpression(
        `mod.isRetryableWorkflowRun({ ...${baseRunExpr}, run_attempt: 4 })`,
      ),
    );
    t.false(
      evalModuleExpression(
        `mod.isRetryableWorkflowRun({ ...${baseRunExpr}, name: 'Some other workflow' })`,
      ),
    );
    t.false(
      evalModuleExpression(
        `mod.isRetryableWorkflowRun({ ...${baseRunExpr}, pull_requests: [] })`,
      ),
    );
  },
);

testNode22(
  'selectLatestRunsByWorkflow prefers the newest run even if an older one failed',
  t => {
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
        name: 'Integration tests',
        head_sha: headSha,
        conclusion: 'success',
        event: 'pull_request',
        status: 'completed',
        run_attempt: 2,
        pull_requests: [{ number: 1 }],
        created_at: '2026-03-06T10:07:00Z',
      },
      {
        id: 16,
        name: 'Test Golang',
        head_sha: headSha,
        conclusion: 'failure',
        event: 'pull_request',
        status: 'completed',
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

    const latestRuns = /** @type {number[]} */ (
      evalModuleExpression(
        `Array.from(mod.selectLatestRunsByWorkflow(${JSON.stringify(runs)}, ${JSON.stringify(
          headSha,
        )}).values()).map(run => run.id).sort((a, b) => a - b)`,
      )
    );

    t.deepEqual(latestRuns, [11, 13, 15, 16]);
  },
);

testNode22(
  'collectRetryTargetsForLabelEvent ignores workflows whose latest run already succeeded',
  t => {
    const headSha = 'abc123';
    const runs = [
      {
        id: 101,
        name: 'Test all Packages',
        head_sha: headSha,
        conclusion: 'failure',
        status: 'completed',
        event: 'pull_request',
        run_attempt: 1,
        pull_requests: [{ number: 1 }],
        created_at: '2026-03-06T10:00:00Z',
      },
      {
        id: 102,
        name: 'Test all Packages',
        head_sha: headSha,
        conclusion: 'success',
        status: 'completed',
        event: 'pull_request',
        run_attempt: 2,
        pull_requests: [{ number: 1 }],
        created_at: '2026-03-06T10:05:00Z',
      },
      {
        id: 103,
        name: 'Integration tests',
        head_sha: headSha,
        conclusion: 'failure',
        status: 'completed',
        event: 'pull_request',
        run_attempt: 1,
        pull_requests: [{ number: 1 }],
        created_at: '2026-03-06T10:06:00Z',
      },
    ];

    const retryRuns = /** @type {number[]} */ (
      evalModuleExpression(
        `mod.collectRetryTargetsForLabelEvent(${JSON.stringify(runs)}, ${JSON.stringify(
          headSha,
        )}).map(run => run.id).sort((a, b) => a - b)`,
      )
    );

    t.deepEqual(retryRuns, [103]);
  },
);

testNode22(
  'collectRetryTargetsForLabelEvent ignores workflows whose latest rerun is already in progress',
  t => {
    const headSha = 'abc123';
    const runs = [
      {
        id: 201,
        name: 'Test all Packages',
        head_sha: headSha,
        conclusion: 'failure',
        status: 'completed',
        event: 'pull_request',
        run_attempt: 1,
        pull_requests: [{ number: 1 }],
        created_at: '2026-03-06T10:00:00Z',
      },
      {
        id: 202,
        name: 'Test all Packages',
        head_sha: headSha,
        conclusion: null,
        status: 'in_progress',
        event: 'pull_request',
        run_attempt: 2,
        pull_requests: [{ number: 1 }],
        created_at: '2026-03-06T10:05:00Z',
      },
      {
        id: 203,
        name: 'Integration tests',
        head_sha: headSha,
        conclusion: 'failure',
        status: 'completed',
        event: 'pull_request',
        run_attempt: 1,
        pull_requests: [{ number: 1 }],
        created_at: '2026-03-06T10:06:00Z',
      },
    ];

    const retryRuns = /** @type {number[]} */ (
      evalModuleExpression(
        `mod.collectRetryTargetsForLabelEvent(${JSON.stringify(runs)}, ${JSON.stringify(
          headSha,
        )}).map(run => run.id).sort((a, b) => a - b)`,
      )
    );

    t.deepEqual(retryRuns, [203]);
  },
);

testNode22(
  "collectRetryTargetsForLabelEvent only retries Mathieu's still-failing workflow",
  t => {
    const headSha = 'abc123';
    const runs = [
      {
        id: 301,
        name: 'Test all Packages',
        head_sha: headSha,
        conclusion: 'failure',
        status: 'completed',
        event: 'pull_request',
        run_attempt: 1,
        pull_requests: [{ number: 1 }],
        created_at: '2026-03-06T10:00:00Z',
      },
      {
        id: 302,
        name: 'Test all Packages',
        head_sha: headSha,
        conclusion: 'success',
        status: 'completed',
        event: 'pull_request',
        run_attempt: 2,
        pull_requests: [{ number: 1 }],
        created_at: '2026-03-06T10:05:00Z',
      },
      {
        id: 303,
        name: 'Integration tests',
        head_sha: headSha,
        conclusion: 'failure',
        status: 'completed',
        event: 'pull_request',
        run_attempt: 1,
        pull_requests: [{ number: 1 }],
        created_at: '2026-03-06T10:06:00Z',
      },
      {
        id: 304,
        name: 'Integration tests',
        head_sha: headSha,
        conclusion: 'failure',
        status: 'completed',
        event: 'pull_request',
        run_attempt: 2,
        pull_requests: [{ number: 1 }],
        created_at: '2026-03-06T10:07:00Z',
      },
    ];

    const retryRuns = /** @type {number[]} */ (
      evalModuleExpression(
        `mod.collectRetryTargetsForLabelEvent(${JSON.stringify(runs)}, ${JSON.stringify(
          headSha,
        )}).map(run => run.id).sort((a, b) => a - b)`,
      )
    );

    t.deepEqual(retryRuns, [304]);
  },
);
