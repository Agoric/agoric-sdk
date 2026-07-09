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
The profiling file is a [Chrome Trace Event JSON Object](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview?tab=t.0#heading=h.q8di1j2nawlp):

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
- `"displayTimeUnit": "ms"` is a viewer hint.
- `cat` is a comma-separated list of categories that can be used for filtering.
- `"ph": "M"` designates a [Metadata event](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview?tab=t.0#heading=h.xqopa5m0e28f); `"ph": "X"` designates a [Complete event](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview?tab=t.0#heading=h.lpfof2aylapb).
- `ts` and `dur` indicate start time and duration (respectively) in microseconds as measured on a monotonic clock.
Further reading is available at [The Trace Event Profiling Tool (about:tracing)](https://www.chromium.org/developers/how-tos/trace-event-profiling-tool/) and [Trace Event Best Practices](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/trace_events.md).
