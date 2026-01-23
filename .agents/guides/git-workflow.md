# Git and PR Workflow

## Overview
Use this when preparing commits, branches, or pull requests.

## Rules
- Use Conventional Commits in titles and commits (e.g., `feat(swingstore): add snapshot…`).
- Branch names should reference an issue number (e.g., `123-fix-solo-reconnect`).
- PRs should link related issues and describe changes and risks.
- Ensure `yarn build`, `yarn test`, and `yarn lint` pass for PRs.
- Prefer “Squash and merge.”
- Integration tests: use labels `force:integration` or `bypass:integration` when appropriate; otherwise they run as part of the merge queue.
