#! /bin/sh
# shellcheck disable=SC2034
NODEJS_VERSION=v16
GOLANG_VERSION=1.20.3
GOLANG_DIR=golang/cosmos
GOLANG_DAEMON=$GOLANG_DIR/build/agd

# Args are major, minor and patch version numbers
golang_version_check() {
  {
    [ "$1" -eq 1 ] && [ "$2" -eq 20 ] && [ "$3" -ge 2 ] && return 0
    [ "$1" -eq 1 ] && [ "$2" -ge 21 ] && return 0
    [ "$1" -ge 2 ] && return 0
  } 2> /dev/null
  echo 1>&2 "need go version 1.20.2+, 1.21+, or 2+"
  return 1
}
