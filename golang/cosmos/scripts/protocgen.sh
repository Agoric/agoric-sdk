#!/usr/bin/env bash

set -eo pipefail

protoc_gen_gocosmos() {
  if ! grep "github.com/gogo/protobuf => github.com/regen-network/protobuf" go.mod &> /dev/null; then
    echo -e "\tPlease run this command from somewhere inside the ibc-go folder."
    return 1
  fi

  go get github.com/regen-network/cosmos-proto/protoc-gen-gocosmos@latest 2> /dev/null
}

protoc_gen_gocosmos

proto_dirs=$(find . -path ./third_party -prune -o -name '*.proto' -print0 | xargs -0 -n1 dirname | sort | uniq)
for dir in $proto_dirs; do
  # NOTE: when migrating to grpc-gateway v2, we will need to remove the
  # allow_colon_final_segments=true
  # as per https://grpc-ecosystem.github.io/grpc-gateway/docs/development/grpc-gateway_v2_migration_guide/#withlastmatchwins-and-allow_colon_final_segmentstrue-is-now-default-behaviour
  protoc \
    -I proto \
    -I third_party/proto \
    --gocosmos_out=plugins=grpc,Mgoogle/protobuf/any.proto=github.com/cosmos/cosmos-sdk/codec/types:. \
    --grpc-gateway_out=logtostderr=true,allow_colon_final_segments=true:. \
    $(find "${dir}" -maxdepth 1 -name '*.proto')
done

# move proto files to the right places
cp -r github.com/Agoric/agoric-sdk/golang/cosmos/* ./
rm -rf github.com
