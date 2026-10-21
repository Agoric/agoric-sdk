# PHP (Composer)

Consumer-repo dep patching in PHP is handled almost exclusively by the [`cweagans/composer-patches`](https://github.com/cweagans/composer-patches) plugin. It reads patch declarations from `composer.json` and applies them to installed dependencies at install time — the direct analog of `patch-package` for the Composer ecosystem.

## Install

```
composer require cweagans/composer-patches
```

## Declare patches in `composer.json`

```json
{
  "extra": {
    "patches": {
      "vendor/package-name": {
        "Fix the frobnicator race": "patches/vendor/fix-frobnicator.patch",
        "Backport PR #234": "https://github.com/vendor/package/pull/234.patch"
      }
    }
  }
}
```

Structure: `vendor/package-name` → description → patch source. Both local file paths and remote URLs are supported in the same dependency entry. Local patches conventionally live in `patches/<vendor>/<file>.patch`.

The description string is arbitrary human-readable text; the plugin does not interpret it as metadata. It is surfaced in `composer install` output when the patch is applied, which makes it a natural place to mention the upstream PR — but see the disposition-recording note below for why the description alone is not enough.

## External patch manifest

For large patch sets, set `patches-file` to reference an external JSON file instead of inlining `extra.patches`:

```json
{
  "extra": {
    "patches-file": "patches.json"
  }
}
```

`patches.json` has the same shape as the inline `extra.patches` value.

## Related configuration

- `enable-patching` — controls whether patches declared by *dependencies* (not only by the root package) are applied. Defaults off. Leave it off unless you have a reason to trust every dep to declare patches sensibly — otherwise transitive patches can silently change behavior on a dep bump.
- `composer-exit-on-patch-failure` — when `true`, `composer install` fails if any patch fails to apply. **Set this in CI.** Otherwise a silent failure leaves a broken dep in place until someone actually exercises the patched code path.
- `patches-ignore` — a map of `vendor/pkg` → list of patch descriptions to skip. Useful to disable a patch without removing it from the config (e.g., during a migration).

## Disposition recording

composer-patches has no metadata schema. The description string in `extra.patches` is the only structured field, and it is uninterpreted — the plugin just echoes it in install output. Use the general recording options SKILL.md describes (README, sidecar file, tracker row); the description string is complementary but insufficient on its own.
