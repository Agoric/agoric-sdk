# @aglocal/boot

Bootstrap configuration and test utilities for Agoric chain tests.

## Test Profiling

`makeSwingsetTestKit` supports opt-in profiling for hotspot analysis.

- Set `AGORIC_BOOT_TEST_PROFILE=1` to enable profiling.
- Optionally set `AGORIC_BOOT_TEST_PROFILE_FILE=/absolute/path/trace.json` to control output location.

If `AGORIC_BOOT_TEST_PROFILE_FILE` is not set, the trace is written to:

`<cwd>/.cache/boot-test-profiles/bootstrap-supports-<pid>.trace.json`

where `<cwd>` is the process working directory for the test run (often `packages/boot` for `yarn workspace @aglocal/boot test ...`).

When profiling is disabled, no profiling file is written.

### Trace Schema

The profiling file is JSON with this shape:

```json
{
  "displayTimeUnit": "ms",
  "traceEvents": [
    {
      "name": "process_name",
      "ph": "M",
      "pid": 12345,
      "tid": 0,
      "ts": 0,
      "args": {
        "name": "agoric-boot-tests"
      }
    },
    {
      "name": "makeSwingsetTestKit.buildSwingset",
      "cat": "agoric.boot.test-supports",
      "ph": "X",
      "pid": 12345,
      "tid": 0,
      "ts": 8710.2,
      "dur": 6215905.4,
      "args": {
        "configPath": "bundles/config....json",
        "verbose": false
      }
    }
  ]
}
```

Notes:

- `traceEvents` uses Chrome Trace Event format (`ph: "M"` metadata + `ph: "X"` complete events).
- `ts` and `dur` are in microseconds.
- `displayTimeUnit: "ms"` is a viewer hint.
