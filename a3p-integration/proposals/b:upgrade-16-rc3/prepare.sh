#!/bin/bash

# Exit when any command fails
set -uxeo pipefail

# Place here any actions that should happen before the upgrade is proposed. The
# actions are executed in the previous chain software, and the effects are
# persisted so they can be used in the steps after the upgrade is complete,
# such as in the "use" or "test" steps, or further proposal layers.
