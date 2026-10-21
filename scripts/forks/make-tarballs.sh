#! /bin/bash
set -ueo pipefail
REFORK=${REFORK-"$PWD/agoric-sdk/scripts/forks/refork.js"}
mkdir -p tarballs
for dir in *; do
  if test -f "$dir/refork-config.sh"; then
    (
      cd "$dir"
      FORK_BRANCH=
      BASE_REF=
      TARGET_REF=
      # shellcheck disable=SC1091
      source refork-config.sh
      ${REFORK} --status "$FORK_BRANCH" "$BASE_REF" "$TARGET_REF"
    )
    config="$dir/refork-config.sh"
  elif test -x "$dir/refork-status.sh"; then
    (cd "$dir" && REFORK=${REFORK} ./refork-status.sh)
    config="$dir/refork-status.sh $dir/tag.sh"
  else
    continue
  fi

  VERSION=$(sed -ne 's/^- Target ref: //p' "$dir/refork-workspace/report.md")
  tarball=tarballs/refork-$dir-${VERSION}.tar.gz
  # shellcheck disable=SC2086
  test -f "$tarball" || 
    tar -zcvf "$tarball" agoric-sdk/scripts/refork.js $config "$dir/refork-workspace"
  
  cat >"tarballs/README-$dir.md" <<EOF
## $dir - Interchain Stack Upgrade

This tarball contains some details for the proposed Agoric fork upgrade from an
older upstream to a newer upstream. The key artifact is
\`$dir/refork-workspace/diff-of-diffs.patch\`.

What it is
- \`$dir/refork-workspace/diff-of-diffs.patch\` is a "diff of diffs": it shows how the
	changes introduced by the existing Agoric fork (against the old upstream)
	differ from the changes proposed for the new upstream. Review this file to
	understand conflicts, behavioural changes, and required adaptations.

Quick inspection

<details><summary>The report in \`$dir/refork-workspace/report.md\` summarizes the refork process, including any conflicts or issues encountered. Review this report for a high-level overview of the refork status.</summary>

$(cat "$dir/refork-workspace/report.md")

</details>

- Extract the tarball and view the main patch:

\`\`\`sh
tar -xvf "refork-$dir-$VERSION.tar.gz"
less "$dir/refork-workspace/diff-of-diffs.patch"
\`\`\`

EOF
done
