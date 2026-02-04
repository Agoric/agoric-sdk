#!/bin/bash

setopt KSH_ARRAYS BASH_REMATCH 2>/dev/null

# shellcheck disable=SC2296
thisdir=$(cd "$(dirname -- "${BASH_SOURCE[0]:-${(%):-%x}}")" >/dev/null && pwd)
parentdir=$(dirname -- "$thisdir")

# shellcheck disable=SC1091
source "$parentdir/repoconfig.sh"

check_nodejs() {
  local nodeversion noderegexp
  nodeversion=$(node --version)
  noderegexp='v(([0-9]+)\.([0-9]+)\.([0-9]+))'
  [[ "$nodeversion" =~ $noderegexp ]] || {
    echo "Could not determine node version from '$nodeversion'" >&2
    return 1
  }
  matched=${BASH_REMATCH[1]}
  echo "Found node.js version $matched" >&2
  if nodejs_version_check "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}" "${BASH_REMATCH[4]}" "$nodeversion"; then
    return 0
  fi
  echo "Need node.js version $NODEJS_VERSION; found $matched" >&2
  return 1
}

check_golang() {
  local goversion goregexp
  goversion=$(go version)
  goregexp='go version go(([0-9]+)(.([0-9]+)(.([0-9]+))?)?)( |$)'
  [[ "$goversion" =~ $goregexp ]] || {
    echo "Could not determine Go version from '$goversion'" >&2
    return 1
  }
  matched=${BASH_REMATCH[1]}
  echo "Found golang version $matched" >&2
  if golang_version_check "${BASH_REMATCH[2]}" "${BASH_REMATCH[4]}" "${BASH_REMATCH[6]}" "$goversion"; then
    return 0
  fi
  echo "Need golang version $GOLANG_VERSION; found $matched" >&2
  return 1
}

if check_nodejs; then
  switch_nodejs=false
else
  switch_nodejs=true
fi

if check_golang; then
  switch_golang=false
else
  switch_golang=true
fi

if $switch_golang; then
  if type gvm; then
    gvm "$GOLANG_VERSION" -s
    switch_golang=false
  else
    echo "You should manually install gvm or golang $GOLANG_VERSION" >&2
  fi
fi

if $switch_nodejs; then
  if type nvm 2>/dev/null; then
    nvm use "$NODEJS_VERSION"
    corepack enable
    switch_nodejs=false
  else
    echo "You should manually install nvm or Node.js $NODEJS_VERSION" >&2  
  fi
else
  corepack enable
fi

if $switch_golang  || $switch_nodejs; then
  if type nix 2>/dev/null; then
    echo "You may want to do 'nix develop' to get a proper environment" >&2
  fi
fi

# Let the shell continue.
