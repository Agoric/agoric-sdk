#!/usr/bin/env bash

set -xeo pipefail

cosmosclient=$(go list -f '{{ .Dir }}' github.com/cosmos/cosmos-sdk/client)

rm -rf ./tmp-swagger-gen
mkdir -p ./tmp-swagger-gen
xmodimps=$(sed -ne '/\/x\//{s!.*"\(.*/x/[^/]*\).*".*!\1!p;}' app/app.go | sort -u)
for xmodimp in $xmodimps; do
  # generate swagger files (filter query files)
  case "$xmodimp" in
    "cosmossdk.io/x/"*)
      dep=github.com/cosmos/cosmos-sdk
      subdir=/cosmos
      ;;
    "github.com/Agoric/agoric-sdk/golang/cosmos/x/"*)
      dep=github.com/Agoric/agoric-sdk/golang/cosmos
      subdir=/agoric
      ;;
    *)
      dep=$(echo "$xmodimp" | sed -e 's!/x/.*!!')
      subdir=/cosmos
      ;;
  esac

  mod=$(echo "$xmodimp" | sed -e 's!.*/x/\([^/]*\).*!\1!')
  srcdir="$(go list -m -f '{{ .Dir }}' "$dep")/proto"
  srcmods="$srcdir$subdir/$mod"

  case "$xmodimp" in
    *"/x/auth")
      for base_submod in $srcdir/cosmos/base/*; do
        [ -d "$base_submod" ] || continue
        srcmods="$srcmods $base_submod"
      done
      ;;
  esac

  query_files=$(find $srcmods -maxdepth 2 \( -name 'query.proto' -o -name 'service.proto' \))
  for query_file in $query_files; do
    (cd proto && buf generate --template buf.gen.swagger.yaml $query_file)
  done
done

rm -f ./client/docs/config.json ./client/docs/swagger-yaml/swagger.yaml
# cp -a "$cosmosclient/docs/"* client/docs/
jq --rawfile mjson client/agoric-docs-config-merge.json \
  '. as $config | ($mjson | fromjson) as $merge | ($config * $merge) |
  .apis |= (($config.apis + $merge.apis) |
    map(select(.url | test("/(app|circuit|group|nft)/") | not)) |
    sort_by(.url))' "$cosmosclient/docs/config.json" > client/docs/config.json

# combine swagger files
# uses nodejs package `swagger-combine`.
# all the individual swagger files need to be configured in `config.json` for merging
swagger-combine ./client/docs/config.json -o ./client/docs/swagger-yaml/swagger.yaml -f yaml --continueOnConflictingPaths true --includeDefinitions true

# clean swagger files
rm -rf ./tmp-swagger-gen
