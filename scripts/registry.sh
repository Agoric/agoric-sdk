#! /bin/bash

thisdir=$(cd -- "$(dirname "$0")" >/dev/null && pwd)

set -ueo pipefail

# Report, export, and write an environment variable into "$GITHUB_ENV" if set.
persistVar() {
  echo "$1=$2"
  eval "export $1=\$2"
  test -z "${GITHUB_ENV-}" || {
    echo "$1=$2" >> "$GITHUB_ENV"
  }
}

runRegistry() {
  # shellcheck disable=SC2155
  export HOME="$(mktemp -d -t registry-home.XXXXX)"
  export PATH="$thisdir:$PATH"

  # Kill `verdaccio` when the script exits
  trap 'kill $(cat "$HOME/verdaccio.pid")' EXIT

  (
    cd "$HOME"
    echo "Starting Verdaccio in background..."
    : > verdaccio.log
    nohup npx verdaccio@^5.4.0 &>verdaccio.log &
    echo $! > verdaccio.pid

    # Wait for `verdaccio` to boot
    grep -q 'http address' <(tail -f verdaccio.log)

    # Set registry to local registry
    npm set registry http://localhost:4873
    yarn config set registry http://localhost:4873

    # Login so we can publish packages
    npx npm-cli-login@^1.0.0 -u user -p password -e user@example.com \
      -r http://localhost:4873 --quotes

    npm whoami
  ) 1>&2
}

publish() {
  export DISTTAG=agblah
  case $1 in
  manual*)
    flags=--no-git-tag-version
    ;;
  *)
    flags=--canary
    ;;
  esac

  # Publish the packages to our local service.
  # without concurrency until https://github.com/Agoric/agoric-sdk/issues/8091
  yarn lerna publish --concurrency 1 --conventional-prerelease $flags --exact \
    --dist-tag="$DISTTAG" --preid=dev"-$(git rev-parse --short=7 HEAD)" \
    --no-push --no-verify-access --yes

  # Use the locally-installed dist-tag.
  persistVar REGISTRY_HOME "$HOME"
  persistVar REGISTRY_DISTTAG "$DISTTAG"
}

integrationTest() {
  # Install the Agoric CLI on this machine's $PATH.
  case $1 in
  link-cli | link-cli/*)
    yarn link-cli "$HOME/bin/agoric"
    persistVar AGORIC_CMD "[\"$HOME/bin/agoric\"]"
    ;;
  */npm)
    npm install -g "agoric@$DISTTAG"
    persistVar AGORIC_CMD '["agoric"]'
    ;;
  */npx)
    # Install on demand.
    persistVar AGORIC_CMD "[\"npx\",\"agoric@$DISTTAG\"]"
    ;;
  *)
    yarn global add "agoric@$DISTTAG"
    persistVar AGORIC_CMD '["agoric"]'
    ;;
  esac

  test -z "${DISTTAG-}" || {
    persistVar AGORIC_INSTALL_OPTIONS "[\"$DISTTAG\"]"
  }
  persistVar AGORIC_START_OPTIONS '["--rebuild"]'
  persistVar AGORIC_INIT_OPTIONS "[\"--dapp-branch=$2\"]"

  (
    cd "$thisdir/../packages/agoric-cli"

    # Try to avoid hitting a pessimal Actions output rate-limitation.
    SOLO_MAX_DEBUG_LENGTH=1024 \
      yarn integration-test
  )
}

export CI=true
case ${1-} in
ci)
  runRegistry
  publish "${2-manual}"
  integrationTest "${2-manual}" "${3-main}"
  ;;

bg)
  runRegistry
  echo "Publish packages using '$0 publish'"
  trap - EXIT
  echo "HOME=$HOME"
  echo "pid=$(cat "$HOME/verdaccio.pid")"
  ;;

bg-publish)
  runRegistry
  trap - EXIT
  publish "${2-registry}"

  # Git dirty check.
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Git status is dirty, aborting."
    git status
    exit 1
  fi
  ;;

publish)
  publish "${2-manual}"
  echo "Run getting-started integration test with '$0 test'"
  ;;

test)
  test -z "${REGISTRY_HOME-}" || export HOME="$REGISTRY_HOME"
  test -z "${REGISTRY_DISTTAG-}" || export DISTTAG="$REGISTRY_DISTTAG"
  integrationTest "${2-manual}" "${3-main}"
  ;;

*)
  runRegistry
  echo "Publish packages using '$0 publish'"
  # Kill `verdaccio` and remove HOME when the command shell exits
  trap 'kill "$(cat "$HOME/verdaccio.pid")"; rm -rf "$HOME"' EXIT
  if test $# -eq 0; then
    set -- bash
  fi
  "$@"
  ;;
esac
