# ADR 2: Autosquash fixup commits when PR is enqueued to merge queue

## Status

Accepted 2026-02-18.

## Context

We are removing dependence on Mergify while preserving this behavior:

- PRs can be merged to `master` using merge commits (`--merge`), including merge queue.
- `fixup!`, `squash!`, and `amend!` commits should be collapsed automatically.
- Developers should have one primary action for intent: "get this into master".

GitHub merge queue does not perform `git rebase --autosquash` on PR branches. It validates and merges, but does not rewrite commit history before merge.

## Requirements

Functional requirements:

1. Preserve merge-commit integration strategy on `master`.
2. Autosquash fixup-style commits before final merge.
3. Trigger from queue entry so users do not need a separate manual cleanup step.
4. Re-queue automatically after rewrite when possible.

Non-functional requirements:

1. Keep repository security posture: do not rewrite untrusted fork branches with write token.
2. Make failures explicit in PR conversation.
3. Keep behavior deterministic and auditable in Actions logs.

## Decision

Add a GitHub Actions workflow at `.github/workflows/autosquash-on-enqueue.yml` that runs on:

- `pull_request_target` with `types: [enqueued]`.

Behavior:

1. Only run for PRs targeting `master`.
2. Only rewrite same-repository branches (`head.repo.full_name == github.repository`).
3. Detect fixup commits in `origin/master..HEAD` matching `^(fixup|squash|amend)! `.
4. If none exist, no-op.
5. If present, run non-interactive autosquash:
   - `GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash origin/<base>`
6. Force-push rewritten branch with `--force-with-lease`.
7. Re-enable auto-merge with merge method:
   - `gh pr merge <pr-url> --auto --merge`
8. On rebase conflict, comment on PR and fail the workflow.
9. For fork PRs, add a comment explaining that autosquash-on-enqueue is skipped.

This provides the "one action" flow:

- user requests queue merge once,
- workflow performs history cleanup if needed,
- workflow re-applies merge queue intent after rewrite.

## Ruled out

1. Use merge queue alone
- Rejected because merge queue does not autosquash fixup commits.

2. Switch to squash merges
- Rejected because requirement is to keep merge commits for PR integration.

3. Keep a required `no-fixup-commits` blocking check only
- Rejected as primary mechanism because it forces a second user action and breaks the desired one-step intent.

4. Rewrite history on `merge_group` branches
- Rejected because merge-group refs are ephemeral queue branches, not the PR branch of record.

5. Rewrite fork branches from `pull_request_target`
- Rejected for security and trust-boundary reasons.

6. Full agentic merge bot outside Actions
- Rejected for now: higher operational complexity, additional credentials/runtime, and little gain over native Actions for this specific task.

## Consequences

Positive:

- Maintains merge-commit strategy while cleaning fixup commits automatically.
- Keeps user interaction simple.
- Centralizes behavior in auditable repository automation.

Tradeoffs:

- Queue entry may briefly dequeue/requeue when branch history is rewritten.
- Autosquash can fail on conflict and requires manual intervention.
- Fork PRs require manual autosquash by contributor/maintainer.

Operational notes:

1. Branch protection should require checks compatible with this flow; avoid requiring a check that always fails on fixup commits before enqueue.
2. Team guidance should encourage `fixup!` workflows and rely on enqueue-time autosquash.
