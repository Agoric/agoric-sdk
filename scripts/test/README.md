This directory contains shell-based tests for scripts.

test.sh looks for a test.sh in each subdirectory and executes it,
expecting an exit status code of 0 to indicate success.

It exit with status 0 if all tests pass and status 1 if any fail.
