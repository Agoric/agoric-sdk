# Forward-porting patches across version bumps

Bumping a patched dependency is a small project in itself. The patch stack is state, and state must be re-validated against each new upstream version. This reference expands on the short playbook in `SKILL.md`.

## The bump

SKILL.md's step 1 is the inventory step — read each patch's disposition record *before* touching the dependency. Skipping it makes conflict resolution much harder: you won't be able to tell whether a conflict is "upstream evolved the code" or "upstream merged my fix and now my patch collides with itself."

1. **Bump the dependency in isolation** — one commit containing only the lockfile/version change, no other changes. This keeps the diff reviewable.
2. **Attempt to re-apply the stack.** Each tool does this automatically at install time; see [drift-detection.md](drift-detection.md) for the per-tool signal.
3. **For each failed patch,** decide:
   - **Forward-port.** Re-author the patch against the new source. If it is a clean re-expression of the same change, keep the disposition record as-is.
   - **Retire because fixed upstream.** The release you are now pinned to contains the fix. Delete the patch and record the retirement in the bump commit message.
   - **Retire because obsolete.** The code the patch targeted was removed or refactored so the patch's purpose no longer applies. Delete it; note the reason in the commit.
4. **Update disposition records** for any patch whose upstream state changed (PR merged, issue closed, rejection rationale added).
5. **Refresh patches that applied with fuzz or offset.** Even when they "applied," regenerate them against current source. Fuzz today becomes a conflict tomorrow, and the reviewer of your bump commit should see each patch at its correct line numbers.

## Conflict heuristics

When a patch fails to apply, the rejection file (`.rej` in most tools, or similar) shows what could not be placed. Read the `.rej` alongside the upstream git log for the targeted file. The combination almost always tells you which of these happened:

- **The surrounding code moved.** Re-locate the hunk; the change itself still applies.
- **The surrounding code was rewritten.** The change may need to be re-expressed in the new idiom, or the whole patch may now be obsolete. If the rewrite *was* the fix, retire the patch.
- **Your change was upstreamed in some form.** Check whether the upstream edit is equivalent to yours. If yes, retire. If not, your patch may still be needed in a modified form.
- **The surrounding code was deleted.** The patch is almost certainly obsolete.

If you find yourself reaching for `--force` or increasing the fuzz factor to make a patch go, stop. The reviewer of your bump commit cannot tell a correctly-forward-ported patch from a silently-wrong one; the whole value of patches is that they are reviewed diffs.

## Committing

Ship the bump, the patch-file updates, and the disposition-record updates **together** in a single reviewable diff. A bump commit that leaves the patch stack stale breaks the install/build for anyone who pulls before the follow-up lands. Reviewers should see one diff containing: the version change, any patch-file diffs, any retirements (with reasons in the commit message), and any sidecar/header updates.
