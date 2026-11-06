#!/bin/bash
# Usage: COMMAND 2>&1 >&3 | tee-to-github-step-summary.sh SUMMARY_FILE >&2
#
# Copy stdin to stdout like `tee`, and once input ends, append it to
# SUMMARY_FILE (e.g. "$GITHUB_STEP_SUMMARY") rendered as Markdown with ANSI
# escape sequences stripped: runs of ordinary lines become code blocks (to
# keep the original line structure), and each notice/warning/error workflow
# command becomes a heading line with its decoded message in its own code
# block (a `diff` block if the message is a diff).
# With an empty SUMMARY_FILE, just copy stdin to stdout.
# Summary problems are reported but never fail this filter.
# https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-job-summary
set -uo pipefail

summary="${1:-}"
[ -n "$summary" ] || exec cat

# GitHub drops step summaries over 1 MiB; keep the rendered Markdown well
# within that.
MAX_SUMMARY_BYTES=$((512 * 1024))

log="$(mktemp)" || exec cat
trap 'rm -f "$log" "$log.txt" "$log.md"' EXIT
tee "$log"
[ -s "$log" ] || exit 0

# Render the last $1 bytes of the log as Markdown.
render() {
  if [ "$(wc -c <"$log")" -gt "$1" ]; then
    echo "[... truncated to the last $1 bytes ...]"
    # Drop the first (likely partial) line, unless it's the only one.
    tail -c "$1" "$log" | sed '1{$!d}'
  else
    cat "$log"
  fi |
    # Strip CSI and OSC sequences, other escapes, and control characters
    # (except tab).
    LC_ALL=C sed -E \
      -e $'s/\x1b\\[[0-?]*[ -/]*[@-~]//g' \
      -e $'s/\x1b\\][^\x07\x1b]*(\x07|\x1b\\\\)//g' \
      -e $'s/\x1b[ -/]*[0-~]//g' \
      -e $'s/[\x01-\x08\x0b-\x1f\x7f]//g' >"$log.txt"

  # The first pass finds the longest run of tildes anywhere (including in
  # encoded workflow command messages), so no code block can be closed early.
  # https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
  LC_ALL=C awk '
    function decode(s) {
      gsub(/%0D/, "", s); gsub(/%0A/, "\n", s)
      gsub(/%3A/, ":", s); gsub(/%2C/, ",", s); gsub(/%25/, "%", s)
      return s
    }
    function open_block(lang) { print fence lang; in_block = 1 }
    function close_block() { if (in_block) { print fence; print ""; in_block = 0 } }
    FNR == NR {
      s = $0
      while (match(s, /~+/)) {
        if (RLENGTH > max) max = RLENGTH
        s = substr(s, RSTART + RLENGTH)
      }
      next
    }
    FNR == 1 {
      fence = "~~~~"
      while (length(fence) <= max) fence = fence "~"
    }
    match($0, /^::(notice|warning|error)( [^:]*)?::/) {
      close_block()
      head = substr($0, 3, RLENGTH - 4)
      message = decode(substr($0, RLENGTH + 1))
      level = head; sub(/ .*/, "", level)
      title = ""
      if (index(head, " ")) {
        n = split(substr(head, index(head, " ") + 1), props, ",")
        for (i = 1; i <= n; i++) {
          if (props[i] ~ /^title=/) title = decode(substr(props[i], 7))
        }
      }
      print "**" level (title == "" ? "" : ": " title) "**"
      print ""
      open_block(message ~ /^diff / ? "diff" : "text")
      print message
      close_block()
      next
    }
    {
      if (!in_block) open_block("text")
      print
    }
    END { close_block() }
  ' "$log.txt" "$log.txt"
}

# Formatting can outgrow the input (e.g. many short annotations), so budget
# the rendered output, keeping ever-shorter tails (with any fatal error).
budget=$MAX_SUMMARY_BYTES
while :; do
  render "$budget" >"$log.md" ||
    { echo "::warning::failed to render step summary" >&2; exit 0; }
  [ "$(wc -c <"$log.md")" -le "$MAX_SUMMARY_BYTES" ] && break
  budget=$((budget / 2))
  if [ "$budget" -lt 1024 ]; then
    echo '[step output too large to summarize]' >"$log.md"
    break
  fi
done
cat "$log.md" >>"$summary" ||
  echo "::warning::failed to write step summary" >&2
exit 0
