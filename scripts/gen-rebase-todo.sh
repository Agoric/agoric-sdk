#! /bin/bash
set -ueo pipefail
declare -r USAGE="Usage: $0 <commit>

Capture merge-inclusive history of the current branch since <commit>
and output it as a todo list that will recreate it on another branch
when used to overwrite the \"noop\" contents of \`git rebase -i HEAD\`.

This is useful for cherry-picking onto a release branch.
"
usage() {
  [ -n "$1" ] && printf '%s\n' "$1"
  printf '%s' "$USAGE"
  exit 64
}
case "${1-}" in
  --help) usage ;;
  -*) usage 1>&2 "Error: unknown option \"$1\"" ;;
  '') usage 1>&2 "Error: missing commit" ;;
esac

since="$1"

# Get an an initial todo list from `git rebase -i` by using a fake
# editor that echoes the file to standard output and then trucates it to
# ensure that no rebase actually happens.
# Filter the resulting standard error to remove expected "hint" and
# "nothing to do" lines, and send the todo list through a transformation
# pipeline.
{
  fake_editor='cat </dev/null "$@"; truncate -s0 "$@"'
  GIT_SEQUENCE_EDITOR="sh -c '$fake_editor' -" \
    git rebase -i --rebase-merges --no-autosquash "$since" 2>&1 1>&3 \
    | sed -E '/^hint:|^error: nothing to do$/d'
} 3>&1 1>&2 \
  | {
    # Remove any final block of instruction comments (by appending
    # blanks/comments to hold space and flushing that before other lines,
    # minus the line feed before the first appended content).
    sed -nE '/^$|^#/ { H; d; }; H; s/.*//; x; s/^[[:cntrl:]]//; p;'
  } \
  | {
    # Restructure branch-specific blocks:
    # * Move an isolated initial `label` into the first block (and
    #   remove a following no-op `reset`).
    # * When a block starts with `reset` + `merge`, move them into
    #   the previous block.
    # * Add blank lines at the beginning and end
    #   (for later block detection).
    awk '
      BEGIN {
        printf "\n";
      }
      NR == 1 && match($0, /^label /) {
        firstBlockPrefix = $0 "\n";
        label = substr($0, RLENGTH + 1, length($0) - RLENGTH);
        noopReset = "reset " label;
        next;
      }
      firstBlockPrefix != "" && $0 == noopReset {
        next;
      }
      /^$|^# .*[Bb]ranch .*/ {
        blockHeader = blockHeader $0 "\n";
        next;
      }
      blockHeader != "" {
        if (cmdBuf == "" && match($0, /^reset /)) {
          cmdBuf = $0 "\n";
          next;
        } else if (cmdBuf != "" && match($0, /^merge /)) {
          printf "%s%s", cmdBuf, $0 "\n";
          cmdBuf = "";
          next;
        }
      }
      {
        printf "%s%s%s%s", blockHeader, firstBlockPrefix, cmdBuf, $0 "\n"
        blockHeader = "";
        firstBlockPrefix = "";
        cmdBuf = "";
      }
      END {
        printf "%s%s%s\n", blockHeader, firstBlockPrefix, cmdBuf;
      }
    '
  } \
  | {
    # Rename each label that receives `merge` in a block to
    # "base-$branchName", and prefix each source of such merges with a
    # PR reference to "pr-####--...".
    awk '
      function addLabel(label) {
        if (++labels[label] == 1) return;
        print "duplicate label: " label > "/dev/stderr";
        exit 1;
      }
      function ere_escape(s) {
        gsub(/[^a-zA-Z0-9_-]/, "[&]", s);
        gsub(/[[][\\][]]/, "\\\\", s);
        gsub(/[[]\^[]]/, "\\^", s);
        return s;
      }
      $0 == "" && branch != "" && pr != "" {
        re = "\n# [Bb]ranch " ere_escape(branch) "\n";
        if (match(buf, re)) {
          commentTail = substr(buf, RSTART + 3, RLENGTH - 4);
          buf = sprintf("%s\n# %s\n%s",
            substr(buf, 1, RSTART - 1),
            sprintf("PR #%s %s", pr, commentTail),
            substr(buf, RSTART + RLENGTH, length(buf) - RSTART - RLENGTH + 1));
        }
        newLabel = sprintf("pr-%s--%s", pr, branch);
        addLabel(newLabel);
        renames[++renameCount] = branch SUBSEP newLabel;
      }
      match($0, /^$|^# .*[Bb]ranch /) {
        branch = substr($0, RLENGTH + 1, length($0) - RLENGTH);
        pr = "";
      }
      branch != "" && match($0, /^merge /) && match(prev, /^reset /) {
        onto = substr(prev, RLENGTH + 1, length($0) - RLENGTH);
        sub(/[[:space:]].*/, "", onto);
        newOnto = "base-" branch;
        addLabel(newOnto);
        renames[++renameCount] = onto SUBSEP newOnto;

        if (!match($0, /(gh-|#)[0-9]+/)) {
          pr = "";
        } else {
          pr = substr($0, RSTART, RLENGTH);
          sub(/^[^0-9]*/, "", pr);
        }
      }
      /^label / {
        addLabel(substr($0, RLENGTH + 1, length($0) - RLENGTH));
      }
      {
        buf = buf $0 "\n";
        prev = $0;
      }
      END {
        # For "last-wins" semantics, apply renames in reverse order.
        for (i = renameCount; split(renames[i], pair, SUBSEP); i--) {
          len1 = length(pair[1]);
          j = split("label reset merge", rebaseCmds, " ");
          for (; cmd = rebaseCmds[j]; j--) {
            newBuf = "";
            # "reset" and "merge" are followed by a label,
            # but "merge" usually has an intervening "-C/-c" and commit id.
            seekLine = sprintf("\n%s ", cmd);
            if (cmd != "merge") seekLine = seekLine pair[1];
            while (k = index(buf, seekLine)) {
              # Consume everything before the match.
              newBuf = newBuf substr(buf, 1, k - 1);
              buf = substr(buf, k, length(buf) - (k - 1));

              # Expand the match as needed.
              len = length(seekLine);
              if (cmd == "merge") {
                match(buf, /^\nmerge( -[Cc] [^ \n]*)? [^ \n]*/);
                if (RLENGTH) len = RLENGTH;
              }

              # Define the replacement (or lack thereof if the match
              # does not actually reference the renamed label).
              r = substr(buf, 1, len);
              if (len > len1 \
                && substr(buf, len - len1, len1 + 1) == " " pair[1] \
                && match(substr(buf, len + 1, 1), /[ \n]/)) {

                r = substr(buf, 1, len - len1) pair[2];
              }

              # Apply the replacement and consume the match.
              newBuf = newBuf r;
              buf = substr(buf, len + 1, length(buf) - len);
            }
            buf = newBuf buf;
          }
        }
        printf "%s", buf;
      }
    '
  } \
  | {
    # Remove leading and trailing blank lines.
    awk '
      $0 != "" {
        active = 1;
        for (; blanks > 0; blanks--) print "";
        print;
      }
      $0 == "" && active {
        blanks++;
      }
    '
  }
