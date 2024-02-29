#!/bin/bash

# Place here any test that should be executed using the executed proposal.
# The effects of this step are not persisted in further proposal layers.

yarn ava post.test.js
GLOBIGNORE=post.test.js
yarn ava *.test.js
