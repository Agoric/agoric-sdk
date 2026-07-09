---
name: maintaining-dependency-patches
description: Manage a source-code repo's local patches against its installed package-manager dependencies — when a dep has a bug, security fix, or behavior tweak that upstream will not ship in time. Covers tracking each patch's relationship to upstream (is an issue filed? is a PR open? has it merged or been rejected?), detecting drift when upstream changes, forward-porting across version bumps, and upstream etiquette. Use when working with patch-package, yarn patch, pnpm patch, .yarn/patches/, the cweagans/composer-patches plugin in PHP, or Bazel's http_archive patches and Bzlmod single_version_override patches (which handle diff patching for polyglot deps regardless of language). Not for distribution-side patching (Homebrew/nixpkgs/Debian/Gentoo/BSD ports) nor for fork-and-redirect approaches (Cargo [patch], go mod replace, Bundler :git, requirements.txt git URLs, Elixir Mix :git).
license: MIT
---

## Scope & when to activate

This skill applies when **a source-code repo carries local patches against its installed package-manager dependencies** — because a dep has a bug, a security fix not yet released, a behavior tweak upstream will not accept, or a compatibility shim for your stack. The patches live in your repo, alongside your application code; they are applied at install time on top of already-built artifacts pulled from the registry.

**Activate for:**

- JavaScript/TypeScript projects using `patch-package`, `yarn patch`, or `pnpm patch`. Patches typically land in `patches/` or `.yarn/patches/`. See [references/ecosystems/js.md](references/ecosystems/js.md).
- PHP projects using the `cweagans/composer-patches` Composer plugin. Patches are referenced from `extra.patches` in `composer.json`. See [references/ecosystems/php.md](references/ecosystems/php.md).
- Bazel monorepos patching deps via `http_archive(patches = [...])` (WORKSPACE-era) or `single_version_override(patches = [...])` (Bzlmod). Applies regardless of the dep's language — C/C++, Go, Java, Python, etc. See [references/ecosystems/bazel.md](references/ecosystems/bazel.md).

**Do not activate for:**

- **Distribution-side patching** — Homebrew `patch do`, nixpkgs `patches = [...]` / `fetchpatch`, Debian `debian/patches/` with `quilt`, Gentoo ebuild `PATCHES=()`, BSD ports `files/patch-*`. Different lifecycle; see [the repo README](../README.md#out-of-scope-distribution-side-patching) for rationale.
- **Fork-and-redirect** — Cargo `[patch]`, `go mod replace`, Bundler `:git`/`:path`, `requirements.txt` git URLs, Elixir Mix `{:pkg, git: …}`, Maven/Gradle artifactory forks. Different mechanics; see [the repo README](../README.md#out-of-scope-fork-and-redirect) for rationale.
- Claude session edits as a portable `.patch` file → [generating-patches](https://skills.sh/oaustegard/claude-skills/generating-patches).
- Pulumi Terraform-provider submodule + rebase workflow → [upstream-patches](https://skills.sh/pulumi/agent-skills/upstream-patches).

## Upstream disposition and freshness

Every patch has two orthogonal states worth tracking. Ecosystems differ widely in how formally they record them, but the states themselves are the same.

**Upstream disposition** — the patch's relationship to upstream maintainers:

- *No contact.* Private workaround; no issue, no PR. Fine short-term; risky as long-term posture — no one else knows about the bug.
- *Issue filed.* Bug visible to upstream; no fix proposed yet.
- *PR submitted.* Fix proposed, awaiting review. Ideal: patch on disk equals the PR's commits so retirement is a one-line delete on merge.
- *Accepted upstream.* Merged upstream but not yet in a pinned release. Retire at the next bump past the release.
- *Rejected.* Upstream declined. The patch is now indefinite; reconsider vendoring or forking.
- *Will-not-upstream.* Intentionally local (e.g., a deployment-specific default). Never retires; record the reason so future maintainers do not try to upstream it.

**Freshness** — the patch's relationship to the upstream version you have pinned:

- *Applies cleanly.* No conflicts, offset, or fuzz against current pinned source.
- *Applies with offset or fuzz.* Tool reports surrounding-context shifts. Works today, likely breaks on next bump — refresh now against current source.
- *Conflicts.* No longer applies. Forward-port against the new source, or retire if no longer needed.
- *Obsolete.* Target code removed or refactored away. Delete the patch.
- *Fixed upstream in the pinned release.* Pinned version already contains the fix. Delete the patch; note the retirement in the version-bump commit.

The axes are orthogonal, and the combination tells you what to do. *PR submitted, applies cleanly* is a healthy in-flight patch. *Accepted, conflicts* is an invitation to forward-port once and then drop the patch at the next bump. *Rejected, obsolete* should have been deleted already and is a drift signal worth investigating.

How disposition is recorded varies by tool, but consumer-repo dep patching is a young enough niche that no cross-tool standard has emerged. `patch-package`, Yarn's `patch:` protocol, pnpm's `patchedDependencies`, `composer-patches`, and Bazel's `http_archive(patches = [...])` all work with plain unified-diff files and have no metadata schema; teams record disposition however they like — a README alongside the patches, a sidecar file per patch, a row in a ticket tracker. Freshness is surfaced the same way across all of them: the tool fails at install time with a diff-application error. See the relevant ecosystem reference for per-tool specifics and [references/drift-detection.md](references/drift-detection.md) for active-check techniques that catch drift before the next install fails.

Before editing or renewing an existing patch, read whatever disposition record exists — header, comment, or sidecar — since it determines whether the right move is to amend the patch, open a new PR, or retire it entirely. See [references/drift-detection.md](references/drift-detection.md) for automated freshness checks.

## Drift detection

Drift is the gap between a patch as it sits on disk and what would be correct right now — target code moved, fix released upstream, linked issue/PR state changed. Run it as a loop: detect → forward-port or retire each finding → re-detect until clean. On every dependency bump at minimum; ideally in CI. See [references/drift-detection.md](references/drift-detection.md) for the full drift taxonomy, per-tool passive signals, and active-check techniques.

## Forward-porting on version bumps

Every patch must be re-validated against each new upstream version. The core sequence:

1. **Inventory the patch stack** and read each patch's recorded disposition (header, comment, or sidecar) *before* touching anything. You will want that context when interpreting conflicts.
2. **Bump the dependency** and attempt to re-apply the stack.
3. **For each conflict**, forward-port the patch against the new source, or retire it if the patch is obsolete or fixed upstream. Do not use `--force` or high fuzz factors to paper over conflicts — the value of patches is that they are reviewed diffs; a silently-wrong patch is worse than a failing one.
4. **Update disposition records** to reflect any change in upstream state surfaced during the bump (PR merged, issue closed, rejection rationale).
5. **Commit the bump, updated patches, and retirements together** so the diff is reviewable as a single unit.

See [references/forward-porting.md](references/forward-porting.md) for conflict-resolution heuristics and the ecosystem-specific refresh commands.

## Upstream etiquette

Any patch that persists beyond a day or two should have a public upstream pathway. The minimum obligation is one of:

- An **issue** filed upstream describing the bug the patch works around, linked from the disposition record.
- A **PR** proposing the fix, linked from the disposition record. Where feasible, the patch file on disk should be the commits that the PR contains, so retirement is a mechanical delete once the PR merges rather than a re-authoring exercise.

When a linked PR merges, retire the patch at the first bump past the release that contains the fix. When a PR is rejected, update the record with the rationale — a future maintainer needs to know whether to keep trying to upstream the change or accept the patch as permanent. Private workarounds with no upstream contact are acceptable for hotfixes and deployment-specific overrides, but should not be a team's default posture for general-purpose bugs.

