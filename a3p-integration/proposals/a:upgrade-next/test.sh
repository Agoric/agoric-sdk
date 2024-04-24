#!/bin/bash

GLOBIGNORE=initial.test.js:post.test.js

# Place here any test that should be executed using the executed proposal.
# The effects of this step are not persisted in further proposal layers.

# test the state right after upgrade
yarn ava initial.test.js

# test more, in ways that changes system state
yarn ava ./*.test.js

yarn ava post.test.js
