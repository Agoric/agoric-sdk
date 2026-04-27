# Detecting drift in a patch stack

Drift is any gap between a patch as it sits on disk and what would be correct right now (see the `Upstream disposition and freshness` section of `SKILL.md` for the framing). Drift accumulates silently between version bumps; detection is how you keep the stack honest.

## What to check

For each patch in the stack, answer four questions. The first two are about the patch file itself; the second two are about its relationship to upstream.

1. **Does the patch still apply cleanly?** Not "does the install succeed" — does it apply *cleanly*, with no fuzz, no offset, no rejection. Fuzz and offset are pre-drift warnings that most installers do not surface to the user.
2. **Is the target code still there?** If the function or file being patched was deleted or refactored upstream, the patch may accidentally apply to some replacement construct, or silently apply no effective change.
3. **Is the linked issue or PR still in the state the record claims?** A merged PR means the patch may be retirable at the next bump past the release. A closed-without-merge PR means the record needs a rejection rationale.
4. **Has upstream shipped a release that contains the fix?** Cross-check the linked PR's release-tag against your pinned version.

## Passive signals by tool

Each in-scope tool surfaces question 1 automatically, at install time:

- **JS (`patch-package` / `yarn patch` / `pnpm patch`).** `npm install` / `yarn install` / `pnpm install` fails with a diff-application error at the patch step.
- **PHP (`composer-patches`).** `composer install` fails at the patch step *only if* `composer-exit-on-patch-failure: true` is set. Without it, the failure is a warning easily missed in install output.
- **Bazel (`http_archive(patches = [...])` / `single_version_override`).** `bazel build` / `bazel fetch` fails in the repository rule, reporting the failing file and hunks. Bazel's aggressive caching means `bazel clean --expunge` (or `bazel fetch --force`) may be needed to re-trigger the apply step after editing a patch.

Passive signals catch outright breakage but miss fuzz/offset warnings and miss the upstream-state questions (3 and 4) entirely.

## Active checks (recommended in CI)

Running these on a schedule — not only at bump time — keeps the stack from becoming a surprise during a release-blocking upgrade.

1. **Re-apply from a clean checkout.** Destroy and re-create the install/build directory, then re-install or re-build. This surfaces fuzz and offset that incremental builds hide.
2. **Lint patches with `patch --dry-run -F0 --no-backup-if-mismatch`.** Runs apply logic without modifying files and reports any non-zero offset or fuzz explicitly. Useful wherever raw diff files are on disk and the upstream source is unpacked nearby.
3. **Poll linked issue/PR state.** A small script that reads each patch's disposition record, extracts the issue/PR URL, and queries the forge (GitHub, GitLab, Bitbucket) for the current state. Flag any mismatch between the recorded disposition and the actual state.
4. **Diff targeted files against upstream.** For each patch, enumerate the files it touches and inspect the upstream git log for those files since the patch was authored. Activity on the targeted lines is the strongest leading indicator that forward-porting will be needed.

## How often

At minimum, on every bump. In CI, monthly is a reasonable cadence — long enough that each run is not pure noise, short enough that no patch goes stale for a full release cycle. Surface drift findings as tickets in the same tracker you use for other dependency hygiene, not as chat messages that scroll away.
