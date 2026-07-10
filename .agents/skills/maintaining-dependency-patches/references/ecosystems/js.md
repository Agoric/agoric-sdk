# JavaScript and TypeScript

The JS ecosystem has several patch tools, each producing plain unified diff files but with different storage conventions and install-time wiring. None of them carry a native disposition record — which is a gap projects layer their own convention on top of.

## Tools

**`patch-package`** ([on npm](https://www.npmjs.com/package/patch-package)). The original. Works with npm and Yarn Classic.

```
# after editing node_modules/<pkg>
npx patch-package <pkg>
```

Patches land in `patches/<pkg>+<version>.patch`. Applied by a `postinstall` hook:

```json
"scripts": { "postinstall": "patch-package" }
```

**`yarn patch`** (Yarn Berry, Yarn 2+). First-party.

```
yarn patch <pkg>                # prints an isolated working dir path
# edit files in the working dir
yarn patch-commit -s <dir>      # writes the patch, wires it up
```

Patches land in `.yarn/patches/<pkg>-<hash>.patch`. `package.json` gets a `resolutions` entry pointing `<pkg>@<version>` at a `patch:` protocol URL referencing the patch file. Applied automatically at install time by Yarn.

**`pnpm patch`** (pnpm 7+). First-party.

```
pnpm patch <pkg>                # prints an isolated working dir path
# edit files
pnpm patch-commit <dir>
```

Patches land in `patches/<pkg>@<version>.patch` by default. `package.json` gets a `pnpm.patchedDependencies` entry mapping the exact version to the patch file. Applied automatically at install time by pnpm.

## Disposition recording

None of the three tools records upstream state. A common workaround — a `# Upstream PR: …` comment at the top of the patch file — is fragile: some patch tools strip leading comments, others reject them as malformed diff headers, and a single freeform line cannot capture the multi-axis state from SKILL.md's lifecycle section.

Use the general recording options SKILL.md describes (README, sidecar file, tracker row).

One JS-specific tooling option: [patchlift](https://github.com/turadg/patchlift). It has two decoupled pieces — a producer-agnostic upstream-issue utility and a sidecar-based disposition tracker tied to the `.yarn/patches/` layout. Install as a dev dep for repeated tracker use (`pnpm add -D patchlift`), or run one-shot via `npx`.

**Drafting an upstream issue** (producer-agnostic — works on any plain `.patch` file from `patch-package`, `yarn patch`, `pnpm patch`, or similar):

```
npx patchlift issue patches/react+18.0.0.patch
```

Reads the patch, drafts a GitHub issue from the diff, and opens a browser pre-filled to file it. Pure utility; no state is written.

**Tracking disposition via sidecars** (assumes the `.yarn/patches/<name>.patch` layout): patchlift maintains a sidecar at `.patchlift/<name>.yml` per patch, carrying fields like `upstream.issue`, `upstream.pr`, and `status`. The workflow:

- `patchlift triage` — interactive loop over untracked patches; prompts you to set a disposition on each. Run when first adopting patchlift, and after a bump surfaces new patches.
- `patchlift status <patch> …` — create or update a single patch's sidecar with a new status or metadata. Run as upstream events happen (PR merged, issue closed, rejection rationale). E.g. `patchlift status patches/react+18.0.0.patch --status merged --pr https://github.com/facebook/react/pull/12345`.
- `patchlift inspect` — read-only view of the current metadata across the patch stack. Useful in CI to catch sidecar/patch drift.

Status values: `untracked`, `proposed`, `merged`, `rejected`, `localonly`, `obsolete`. These flatten SKILL.md's disposition × freshness axes into one label (e.g., `obsolete` collapses "target code gone" with "no longer needed"); map back to the two-axis framing when reasoning about lifecycle decisions.

## Other notes

- **`overrides` / `resolutions` are not patches.** They pin a transitive dependency to a specific version, not a modified version of that version. If you need to change code, you still need one of the patch tools above.
- **Editing `node_modules` directly is not patching.** The edit is wiped on the next install unless captured via one of the three tools.
- **Monorepos.** In Yarn workspaces and pnpm workspaces, patches declared at the repo root apply across all workspace installs. Do not maintain per-workspace patch directories — they will not be applied consistently.
