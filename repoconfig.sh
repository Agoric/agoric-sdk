#! /bin/sh
# shellcheck disable=SC2034
NODEJS_VERSION=v16
GOLANG_VERSION=1.20
GOLANG_DIR=golang/cosmos
GOLANG_DAEMON=$GOLANG_DIR/build/agd

# Args are major, minor and patch version numbers
function golang_version_check() {
  # Want 1.20.2+, 1.21+, or 2+
  [ $1 -eq 1 ] && {
    [ $2 -lt 20 ] && echo "need go version 1.20 or higher" 1>&2 && return 1
    [ $2 -eq 20 ] && [ $3 -lt 222 ] && echo "need go version 1.20.2 or higher" 1>&2 && return 1
  } || true
}
