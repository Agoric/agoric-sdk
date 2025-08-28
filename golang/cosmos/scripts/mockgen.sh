#!/bin/bash
mockgen_cmd="mockgen"
go install go.uber.org/mock/mockgen@latest
$mockgen_cmd -source=x/swingset/types/expected_keepers.go -package testutil -destination x/swingset/testutil/mocks.go
