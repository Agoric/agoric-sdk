#!/bin/bash
mockgen_cmd="go tool mockgen"
$mockgen_cmd -source=x/swingset/types/expected_keepers.go \
  -package testutil -destination x/swingset/testutil/mocks.go
