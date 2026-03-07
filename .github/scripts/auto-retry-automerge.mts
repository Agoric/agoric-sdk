#!/usr/bin/env -S node --import ts-blank-space/register

type Label = { name?: string };
type PullRequestRef = { number?: number; labels?: Label[] };
type WorkflowRun = {
  id: number;
  name?: string;
  conclusion?: string | null;
  event?: string;
  run_attempt?: number;
  pull_requests?: PullRequestRef[];
  head_sha?: string | null;
  created_at?: string;
};

const AUTOMERGE_LABELS = new Set([
  'automerge:squash',
  'automerge:no-update',
  'automerge:rebase',
]);

const MONITORED_WORKFLOWS = new Set([
  'Test all Packages',
  'Integration tests',
  'Test Golang',
  'Multichain E2E Tests',
]);

const RETRYABLE_CONCLUSIONS = new Set(['failure', 'timed_out']);
// GitHub numbers the initial run as attempt 1, so "up to 3 retries"
// means retrying failed runs while run_attempt is less than 4.
const MAX_RUN_ATTEMPT = 4;

const isMonitoredWorkflow = (name: string | undefined): boolean =>
  !!name && MONITORED_WORKFLOWS.has(name);

const isAutomergeLabel = (name: string | undefined): boolean =>
  !!name && AUTOMERGE_LABELS.has(name);

const hasAutomergeLabel = (labels: Label[] | undefined): boolean =>
  (labels || []).some(label => isAutomergeLabel(label.name));

const isRetryableWorkflowRun = (run: Partial<WorkflowRun>): boolean =>
  isMonitoredWorkflow(run.name) &&
  RETRYABLE_CONCLUSIONS.has(run.conclusion || '') &&
  run.event === 'pull_request' &&
  typeof run.run_attempt === 'number' &&
  run.run_attempt < MAX_RUN_ATTEMPT &&
  Array.isArray(run.pull_requests) &&
  run.pull_requests.length > 0;

const isRetryableForHeadSha = (
  run: Partial<WorkflowRun>,
  headSha: string,
): boolean => run.head_sha === headSha && isRetryableWorkflowRun(run);

const selectLatestRetryableRuns = (
  runs: WorkflowRun[],
  headSha: string,
): WorkflowRun[] => {
  const latestByWorkflow = new Map<string, WorkflowRun>();

  for (const run of runs) {
    if (!isRetryableForHeadSha(run, headSha) || !run.name) {
      continue;
    }
    const prior = latestByWorkflow.get(run.name);
    if (!prior) {
      latestByWorkflow.set(run.name, run);
      continue;
    }

    const priorCreated = Date.parse(prior.created_at || '') || 0;
    const runCreated = Date.parse(run.created_at || '') || 0;
    if (
      runCreated > priorCreated ||
      (runCreated === priorCreated && run.id > prior.id)
    ) {
      latestByWorkflow.set(run.name, run);
    }
  }

  return [...latestByWorkflow.values()];
};

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
};

const parseJsonEnv = <T,>(name: string): T =>
  JSON.parse(getRequiredEnv(name)) as T;

const githubRequest = async (
  method: string,
  pathname: string,
  body: unknown = undefined,
) => {
  const token = getRequiredEnv('GITHUB_TOKEN');
  const apiUrl = new URL(pathname, getRequiredEnv('GITHUB_API_URL'));
  const res = await fetch(apiUrl, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'agoric-sdk-auto-retry-automerge',
      'x-github-api-version': '2022-11-28',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `${method} ${apiUrl.pathname} failed: ${res.status} ${text}`,
    );
  }

  if (res.status === 204) {
    return undefined;
  }

  return res.json();
};

const rerunFailedJobs = async (runId: number) => {
  const owner = getRequiredEnv('GITHUB_REPOSITORY_OWNER');
  const repo = getRequiredEnv('GITHUB_REPOSITORY').split('/')[1];
  console.log(`Re-running failed jobs for workflow run ${runId}`);
  await githubRequest(
    'POST',
    `/repos/${owner}/${repo}/actions/runs/${runId}/rerun-failed-jobs`,
  );
};

const listWorkflowRunsForHeadSha = async (
  headSha: string,
): Promise<WorkflowRun[]> => {
  const owner = getRequiredEnv('GITHUB_REPOSITORY_OWNER');
  const repo = getRequiredEnv('GITHUB_REPOSITORY').split('/')[1];
  /** @type {WorkflowRun[]} */
  const runs = [];

  for (let page = 1; ; page += 1) {
    const response = (await githubRequest(
      'GET',
      `/repos/${owner}/${repo}/actions/runs?event=pull_request&status=completed&head_sha=${encodeURIComponent(
        headSha,
      )}&per_page=100&page=${page}`,
    )) as { workflow_runs?: WorkflowRun[] };

    const pageRuns = response.workflow_runs || [];
    runs.push(...pageRuns);
    if (pageRuns.length < 100) {
      return runs;
    }
  }
};

const retryForWorkflowRunEvent = async (payload: {
  workflow_run: WorkflowRun;
}) => {
  const run = payload.workflow_run;
  if (!isRetryableWorkflowRun(run)) {
    console.log(`Workflow run ${run.id} is not eligible for auto-retry`);
    return;
  }

  const prs = run.pull_requests || [];
  const eligiblePr = prs.find(pr => hasAutomergeLabel(pr.labels));
  if (!eligiblePr) {
    console.log(
      `Workflow run ${run.id} has no associated PR with an automerge label`,
    );
    return;
  }

  await rerunFailedJobs(run.id);
};

const retryForAutomergeLabelEvent = async (payload: {
  label?: Label;
  pull_request?: {
    labels?: Label[];
    head?: { sha?: string };
  };
}) => {
  const labelName = payload.label?.name;
  if (!isAutomergeLabel(labelName)) {
    console.log(`Ignoring non-automerge label ${labelName || '<missing>'}`);
    return;
  }

  const pullRequest = payload.pull_request;
  if (!pullRequest || !hasAutomergeLabel(pullRequest.labels)) {
    console.log('Pull request is missing an automerge label');
    return;
  }

  const headSha = pullRequest.head?.sha;
  if (!headSha) {
    console.log('Pull request head SHA is unavailable');
    return;
  }

  const runs = await listWorkflowRunsForHeadSha(headSha);
  const retryRuns = selectLatestRetryableRuns(runs, headSha);
  if (retryRuns.length === 0) {
    console.log(`No failed monitored workflow runs found for ${headSha}`);
    return;
  }

  for (const run of retryRuns) {
    await rerunFailedJobs(run.id);
  }
};

const main = async () => {
  const eventName = getRequiredEnv('GITHUB_EVENT_NAME');
  const payload = parseJsonEnv<Record<string, unknown>>(
    'GITHUB_EVENT_PAYLOAD_JSON',
  );

  if (eventName === 'workflow_run') {
    await retryForWorkflowRunEvent(payload as { workflow_run: WorkflowRun });
    return;
  }
  if (eventName === 'pull_request') {
    await retryForAutomergeLabelEvent(
      payload as {
        label?: Label;
        pull_request?: { labels?: Label[]; head?: { sha?: string } };
      },
    );
    return;
  }

  throw new Error(`Unsupported event ${eventName}`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}

export {
  AUTOMERGE_LABELS,
  MONITORED_WORKFLOWS,
  RETRYABLE_CONCLUSIONS,
  MAX_RUN_ATTEMPT,
  hasAutomergeLabel,
  isAutomergeLabel,
  isMonitoredWorkflow,
  isRetryableWorkflowRun,
  retryForAutomergeLabelEvent,
  retryForWorkflowRunEvent,
  selectLatestRetryableRuns,
};
