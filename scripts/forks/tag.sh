#! /bin/bash

set -ueo pipefail

# shellcheck disable=SC1091
source refork-config.sh

DRY_RUN=
FORCE=
while test $# -gt 0; do
	case "$1" in
	-n | --dry-run) DRY_RUN='echo' ;;
	-f | --force) FORCE='-f' ;;
	*) echo "Usage: $0 [--dry-run|-n] [--force|-f]" >&2; exit 1 ;;
	esac
	shift
done

find . -name go.mod -print | sort | while read -r gomod; do
	dir=$(dirname "$gomod")

	# shellcheck disable=SC2001
	reldir=$(echo "$dir" | sed -e 's!^\./!!')
	# echo "Processing directory: $dir $reldir"

	v=
	if test "$reldir" = .; then
		# Current working directory, no prefix needed.
		v="$VERSION"
	else
		for pfx in $PREFIXES; do
			# echo "trying $pfx"
			case $pfx in
			"$reldir"*) v="$pfx$VERSION"; break ;;
			esac
		done
		test -z "$v" && {
			v="$reldir/$VERSION"
		}
	fi

	$DRY_RUN git tag $FORCE "$v"
	$DRY_RUN git push -u origin $FORCE "$v"
done
