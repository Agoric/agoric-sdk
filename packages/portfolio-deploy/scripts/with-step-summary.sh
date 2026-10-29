#!/bin/bash
# Usage: with-step-summary.sh COMMAND [ARG...]
#
# Run COMMAND with its stderr both passed through (for the job log) and, once
# it exits, appended to $GITHUB_STEP_SUMMARY (when set) as a code block with
# ANSI escape sequences stripped, so the Markdown summary keeps the original
# line structure. stdout is left untouched so callers can still capture it.
# Exits with COMMAND's status; summary problems never change it.
# https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary
set -uo pipefail

[ $# -gt 0 ] || { echo "Usage: $0 COMMAND [ARG...]" >&2; exit 64; }

# GitHub drops step summaries over 1 MiB; keep the tail (with any fatal
# error) well within that.
MAX_LOG_BYTES=$((512 * 1024))

if [ -z "${GITHUB_STEP_SUMMARY:-}" ]; then
  exec "$@"
fi
log="$(mktemp)" || exec "$@"
trap 'rm -f "$log" "$log.md"' EXIT

exec 3> >(tee "$log" >&2)
tee_pid=$!
# Don't leak fd 3 to COMMAND, or a descendant could hold the pipe open.
"$@" 2>&3 3>&-
status=$?
exec 3>&-

# Let tee drain so the summary includes the tail (e.g. a fatal error), but
# don't hang if a lingering descendant of COMMAND still holds its stderr.
# The watchdog must not hold stdout, which a caller may be capturing.
(sleep 10 && kill "$tee_pid") </dev/null >/dev/null 2>&1 &
watchdog_pid=$!
wait "$tee_pid"
kill "$watchdog_pid" 2>/dev/null

[ -s "$log" ] || exit "$status"
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
} >>"$GITHUB_STEP_SUMMARY" || echo "::warning::failed to write step summary" >&2
exit "$status"
