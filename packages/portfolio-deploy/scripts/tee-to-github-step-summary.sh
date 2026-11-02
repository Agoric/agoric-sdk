#!/bin/bash
# Usage: COMMAND 2>&1 >&3 | tee-to-github-step-summary.sh SUMMARY_FILE >&2
#
# Copy stdin to stdout like `tee`, and once input ends, append it to
# SUMMARY_FILE (e.g. "$GITHUB_STEP_SUMMARY") as a code block with ANSI
# escape sequences stripped, so the Markdown summary keeps the original
# line structure. With an empty SUMMARY_FILE, just copy stdin to stdout.
# Summary problems are reported but never fail this filter.
# https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary
set -uo pipefail

summary="${1:-}"
[ -n "$summary" ] || exec cat

# GitHub drops step summaries over 1 MiB; keep the tail (with any fatal
# error) well within that.
MAX_LOG_BYTES=$((512 * 1024))

log="$(mktemp)" || exec cat
trap 'rm -f "$log" "$log.md"' EXIT
tee "$log"

[ -s "$log" ] || exit 0
if [ "$(wc -c <"$log")" -gt "$MAX_LOG_BYTES" ]; then
  echo "[... truncated to the last $MAX_LOG_BYTES bytes ...]"
  # Drop the first (likely partial) line, unless it's the only one.
  tail -c "$MAX_LOG_BYTES" "$log" | sed '1{$!d}'
else
  cat "$log"
fi |
  # Strip CSI and OSC sequences, other escapes, and control characters
  # (except tab), and ensure a final newline before the closing fence.
  LC_ALL=C sed -E \
    -e $'s/\x1b\\[[0-?]*[ -/]*[@-~]//g' \
    -e $'s/\x1b\\][^\x07\x1b]*(\x07|\x1b\\\\)//g' \
    -e $'s/\x1b[ -/]*[0-~]//g' \
    -e $'s/[\x01-\x08\x0b-\x1f\x7f]//g' \
    -e '$a\' >"$log.md"
# Longer than any tilde fence in the content, so it can't be closed early.
fence="$(grep -oE '^ {0,3}~{3,}' "$log.md" | tr -d ' ' | sort | tail -n 1)~~~~"
{
  echo "${fence}text"
  cat "$log.md"
  echo "$fence"
} >>"$summary" || echo "::warning::failed to write step summary" >&2
exit 0
