#! /bin/sh
# shellcheck disable=SC2034
NODEJS_VERSION=v20
GOLANG_VERSION=1.22.12
GOLANG_DIR=golang/cosmos
GOLANG_DAEMON=$GOLANG_DIR/build/agd

# golang_version_check $major $minor $patch $version
golang_version_check() {
  # Keep synchronized with README.md section "Prerequisites".
  {
    [ "$1" -eq 1 ] && [ "$2" -eq 22 ] && [ "$3" -ge 12 ] && return 0
    [ "$1" -eq 1 ] && [ "$2" -ge 23 ] && return 0
  } 2> /dev/null
  echo 1>&2 "need Go version $GOLANG_VERSION+, found $4"
  return 1
}

# nodejs_version_check $major $minor $patch $version
nodejs_version_check() {
  # Keep synchronized with README.md section "Prerequisites".
  {
    [ "$1" -eq 18 ] && [ "$2" -ge 12 ] && return 0
    [ "$1" -eq 20 ] && [ "$2" -ge 9 ] && return 0
    [ "$1" -eq 22 ] && [ "$2" -ge 11 ] && return 0
  } 2> /dev/null
  echo 1>&2 "need Node.js LTS version ^18.12 or ^20.9 or ^22.11, found $4"
  return 1
}
