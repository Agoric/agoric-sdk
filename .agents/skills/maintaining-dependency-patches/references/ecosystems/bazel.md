# Bazel

Bazel is a polyglot build system; it fetches third-party code via repository rules (WORKSPACE-era) or module overrides (Bzlmod) and applies patches to the fetched archive before any build step runs. The patched source is then built like any other dep — regardless of its language — so Bazel's patching surface is the practical mechanism for consumer-side diff patching of C/C++, Go, Java, or Python deps in Bazel monorepos, which otherwise would not have a native diff-patch tool.

## WORKSPACE-era: `http_archive`

From the [Bazel repo rules docs](https://bazel.build/rules/lib/repo/http):

```python
http_archive(
    name = "foo",
    urls = ["https://example.com/foo-1.2.3.tar.gz"],
    sha256 = "abc...",
    strip_prefix = "foo-1.2.3",
    patches = [
        "//third_party/foo:001-fix-race.patch",
        "//third_party/foo:002-backport-pr-456.patch",
    ],
    patch_args = ["-p1"],
)
```

Patch-related attributes:

| Attribute | Type | Purpose |
|---|---|---|
| `patches` | list of Labels | Patch files in your repo, applied in list order. |
| `patch_args` | list of strings | Passed to `patch` (e.g., `["-p1"]`). |
| `patch_strip` | int | Alternative to `-p` in `patch_args` — sets strip level. |
| `patch_cmds` | list of strings | Shell commands run after patches on Linux/macOS. |
| `patch_cmds_win` | list of strings | Same, for Windows. |
| `patch_tool` | string | Override the default `patch` binary. |
| `remote_patches` | dict (URL → sha256) | Patches fetched by URL rather than from the local tree. |
| `remote_patch_strip` | int | Strip level for `remote_patches`. |

**Execution order:** `remote_patches` first, then `patches` from the local tree, then `patch_cmds`. The same attribute set is available on `new_git_repository` and `git_repository`.

## Bzlmod: `single_version_override`

`MODULE.bazel` does not accept patches on `bazel_dep()` directly. To patch a module dep, use `single_version_override` (or `archive_override` / `git_override`, which forward to `http_archive` / `git_repository`):

```python
# MODULE.bazel
bazel_dep(name = "foo", version = "1.2.3")

single_version_override(
    module_name = "foo",
    patches = ["//patches:foo-001-fix-race.patch"],
    patch_strip = 1,
)
```

`single_version_override` attributes for patching:

- `patches` — list of labels, applied in list order.
- `patch_strip` — same as `-p` in Unix `patch`.
- `patch_cmds` — sequence of Bash commands applied after patches (Linux/macOS).

`archive_override` and `git_override` forward to the underlying repository rules, so the full WORKSPACE-era patch attribute set is reachable through them when needed.

## Patch storage

By convention, patches live in a `patches/` directory or a language-keyed `third_party/<dep>/` subtree at the repo root. The label pointing to each patch must reference a package that exports the patch file:

```python
# third_party/foo/BUILD.bazel
exports_files([
    "001-fix-race.patch",
    "002-backport-pr-456.patch",
])
```

Without `exports_files` (or `filegroup`), `patches = [...]` labels will not resolve.

## Disposition recording

No schema. Use the general recording options SKILL.md describes. One Bazel-specific idiom: since patches are declared with human-readable filenames (`001-fix-race.patch`, `backport-pr-456.patch`), the filename can carry a lightweight disposition hint — a sequence number for apply order, an upstream PR reference. Treat this as shorthand only; the full disposition record still belongs in a sidecar or header.

## Freshness

Surfaced at `bazel build` / `bazel fetch` time when the patch step fails; Bazel reports the failing file and the offending hunks. Caveat: Bazel caches repository state aggressively, so after editing a patch file or the archive declaration you may need `bazel clean --expunge` (or a targeted `bazel fetch --force`) to invalidate the cached patched tree and see a fresh apply attempt. Incremental builds can otherwise continue using the previously-patched cache and hide drift.
