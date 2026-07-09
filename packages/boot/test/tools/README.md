# Boot Test Tools

## Naming

Use these path conventions under `packages/boot/test`:

- `test/fixtures`: checked-in static test inputs
- `test/cache`: generated reusable test state and cacheable derived artifacts
- tmp dirs elsewhere: ephemeral per-run scratch data

Runutils snapshots are generated, fingerprinted, and rebuilt on demand, so they
belong under `test/cache`, not `test/fixtures`.

## Test ordering

`packages/boot` uses an explicit AVA `sortTestFiles` comparator in
`packages/boot/ava.config.mjs`.

That comparator, `byExplicitBootOrder`, makes AVA's sorted file list follow the
fixed `bootTestOrder` sequence.

That order serves two purposes:

- keep tests that reuse the same runutils snapshot in as few CI shards as possible
- spread the remaining heavy tests across the 4 CI shards where that does not increase snapshot-family fanout

AVA sorts the full file list and then slices it contiguously for CI sharding, so
adding a new test file can otherwise move unrelated heavy tests onto a slower
shard. When adding a new boot test, update `bootTestOrder` so shard balance and
snapshot locality stay intentional.

If a new boot test is omitted from `bootTestOrder`, it still runs. The
comparator places it after all listed tests and falls back to normal path
sorting among unlisted files, which preserves correctness but can silently
reintroduce shard skew and poorer snapshot locality.

The order is intentionally optimized for snapshot-family fanout first, then
balance:

- tests that reuse the same snapshot should stay in the same shard whenever practical
- small snapshot families should not be split just to make the shard list look more even
- only large or non-snapshot tests should be used to smooth out shard runtimes

This matters because a cold CI run can regenerate the same snapshot once per
shard that needs it. Keeping each snapshot family in as few shards as possible
reduces duplicated cold-start work.

## Runutils snapshots

`runutils-snapshots.ts` manages reusable boot snapshots for `packages/boot` tests.

Each snapshot is defined in `RUNUTILS_SNAPSHOT_SPECS` with:

- `configSpecifier`: the base boot config used to create the snapshot
- `description`: short human-readable intent for the snapshot

Avoid duplicate snapshot families. If two test suites use the same boot config
and no additional setup, they should share the same snapshot name and cache key.

### Snapshot lifecycle

`createRunUtilsSnapshot(name)` does this:

1. build the current kernel bundle
2. compute the snapshot fingerprint
3. boot a fresh `SwingsetTestKit`
4. `snapshotAllVats()`
5. commit the swing-store
6. write the snapshot metadata and kernel bundle
7. leave the captured swing-store on disk for later restore

`createRunUtilsSnapshot(name)` creates a fresh swingset, snapshots all vats, commits swingstore state, and writes:

- `kernel-bundle.json`
- `metadata.json`
- the snapshot swingstore directory

These are written under `packages/boot/test/cache/runutils`.

`loadRunUtilsSnapshot(name)` validates those files against the current source
tree and kernel bundle. `loadOrCreateRunUtilsSnapshot(name)` wraps that with
regeneration and a cross-process lock so concurrent test processes do not all
rewrite the same snapshot path at once.

## Fingerprinting

Snapshot freshness is determined by a per-snapshot fingerprint stored in `metadata.json` as `snapshotFingerprint`.

`computeRunUtilsSnapshotFingerprint(name)` hashes:

- `SNAPSHOT_VERSION`
- the snapshot name
- the current kernel bundle SHA-512
- the contents of all input files for that snapshot

The input file set is:

- shared inputs:
  - `packages/boot/test/tools/runutils-snapshots.ts`
  - `packages/boot/tools/supports.ts`
- the snapshot's `configSpecifier`

`computeRunUtilsSnapshotsFingerprint()` combines all per-snapshot fingerprints into one aggregate value. CI uses that aggregate value as the boot snapshot cache key.

For day-to-day CI, the workflow uses the per-snapshot fingerprints directly so
each shard can restore or regenerate only the snapshots it actually needs.

## Local and CI behavior

Local dev and CI use the same fingerprint logic.

- Local `loadRunUtilsSnapshot(name)` rebuilds if:
  - `SNAPSHOT_VERSION` changed
  - the stored `snapshotFingerprint` does not match the current fingerprint
  - the stored kernel bundle hash does not match the saved bundle file
  - the current kernel bundle hash does not match the metadata
- Local regeneration also times out if another process holds the snapshot lock
  for too long, rather than waiting forever on a stale `.lock`.
- CI restores per-snapshot caches in each boot shard, using
  `create-runutils-snapshot.ts --cache-keys` to compute the exact keys once per
  job.
- On a cache miss, the boot tests call `loadOrCreateRunUtilsSnapshot(name)` and
  regenerate only the snapshots that shard actually needs.
- After the test run, CI saves back only snapshots that this shard actually
  regenerated, using `.ci-regenerated/` marker files.

This keeps local staleness checks and CI cache invalidation aligned.

### Warm vs cold CI

Warm and cold runs have different tradeoffs:

- warm run: the direct per-shard cache restores are usually a net win because
  shards start immediately after `build` and avoid the full boot cost
- cold run: a snapshot may be regenerated independently in more than one shard
  if those shards both need it before any shared cache exists

Because of that tradeoff, the sharding order tries to keep each snapshot family
inside as few shards as possible. Snapshot locality matters more than perfect
lexicographic or file-count balance.

## Important limits

Snapshot fingerprinting is only as complete as the declared inputs. Right now
those inputs are intentionally narrow:

- shared snapshot-tool inputs
- the selected boot config
- the current kernel bundle hash

If a future snapshot adds more setup work than "boot this config and capture
it", the fingerprint rules must be expanded along with that snapshot.

## CLI

`create-runutils-snapshot.ts` supports:

- `--list`: list known snapshot names
- `--all`: generate all snapshots
- `--cache-key`: print the aggregate fingerprint used by tooling that wants one combined key
- `--cache-key <name>`: print one snapshot fingerprint for per-snapshot cache keys
- `--cache-keys`: print all per-snapshot fingerprints in one JSON object
- `--check <name>`: exit successfully if the named snapshot on disk is current
- `<name>`: generate a single snapshot
