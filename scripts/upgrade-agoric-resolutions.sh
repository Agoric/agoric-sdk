#! /bin/bash
AGORIC_SDK=${AGORIC_SDK-$(cd "$(dirname -- "${BASH_SOURCE[0]}")/.." > /dev/null && pwd)}
ENDO=${ENDO-$(cd "$AGORIC_SDK/../endo" > /dev/null && pwd)}

for src in "$ENDO" "$AGORIC_SDK"; do
  if [ ! -d "$src" ]; then
    echo "Directory not found: $src" >&2
    read -rp "Enter new directory: " src
    exit 1
  fi
  case "$src" in
    "$AGORIC_SDK")
      disttag=dev
      ;;
    *)
      disttag=latest
      ;;
  esac
  echo 1>&2 "===== Resolving disttag=$disttag for $src"
  (cd "$src" && "$AGORIC_SDK/scripts/npm-dist-tag.sh" lerna --json ls "$disttag") \
    | "$AGORIC_SDK/scripts/resolve-versions.sh"
done
