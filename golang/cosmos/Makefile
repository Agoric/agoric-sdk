# sed is more fragile, but we don't want to take a Node.js or jq dependency
# just to compile the Golang pieces under Docker.
NAME := $(shell sed -ne 's/.*"name": "\([^"]*\)".*/\1/p' package.json)
VERSION := $(shell sed -ne 's/.*"version": "\([^"]*\)".*/\1/p' package.json)
COMMIT = $(shell hash=`git rev-parse --short HEAD 2>/dev/null`; if test -n "$$hash"; then echo $$hash`git diff --quiet || echo -dirty`; else cat git-revision.txt; fi)

default: all

MOD_READONLY = # -mod=readonly

BIN := $(shell echo $${GOBIN-$${GOPATH-$$HOME/go}/bin})

include Makefile.ledger

whitespace :=
whitespace += $(whitespace)
comma := ,
build_tags_comma_sep := $(subst $(whitespace),$(comma),$(build_tags))

# Note that the version.Name must be alphanumeric only.
# Otherwise, generated "os" keyrings on Ubuntu 20.04 can't be read.
VersionName := $(shell echo "$(NAME)" | sed -e 's/[^A-Za-z0-9]//g')

# process linker flags
ldflags = -X github.com/cosmos/cosmos-sdk/version.Name=$(VersionName) \
		-X github.com/cosmos/cosmos-sdk/version.AppName=ag-cosmos-server \
		-X github.com/cosmos/cosmos-sdk/version.Version=$(VERSION) \
		-X github.com/cosmos/cosmos-sdk/version.Commit=$(COMMIT) \
		-X "github.com/cosmos/cosmos-sdk/version.BuildTags=$(build_tags_comma_sep)"

gcflags =

ifneq ($(GO_DEBUG),)
ldflags += -compressdwarf=false
gcflags += -N -l
endif

ldflags_helper = $(ldflags) \
		  -X github.com/cosmos/cosmos-sdk/version.AppName=ag-cosmos-helper
BUILD_FLAGS := -tags "$(build_tags)" -gcflags '$(gcflags)' -ldflags '$(ldflags)'
BUILD_FLAGS_HELPER :=  -buildmode=exe -tags "$(build_tags)" -gcflags '$(gcflags)' -ldflags '$(ldflags_helper)'

all: compile-helper compile-daemon
compile-go: compile-helper compile-libdaemon
compile-node: node-compile-gyp


compile-daemon: compile-libdaemon node-compile-gyp

# We need this so that node-gyp can be found.
node-compile-gyp:
	if yarn -v >/dev/null 2>&1; then \
		yarn build:gyp; \
	else \
		npm run build:gyp; \
	fi

# Only run from the package.json build:gyp script.
compile-gyp:
	cp binding.gyp.in binding.gyp
	node-gyp configure build $(GYP_DEBUG) || { status=$$?; rm -f binding.gyp; exit $$status; }
	rm -f binding.gyp

compile-helper: go-mod-cache
	go build -v $(MOD_READONLY) $(BUILD_FLAGS_HELPER) -o build/ag-cosmos-helper ./cmd/helper

compile-libdaemon: go-mod-cache
	go build -v $(MOD_READONLY) $(BUILD_FLAGS) -buildmode=c-shared -o build/libagcosmosdaemon.so ./cmd/libdaemon/main.go
	test "`uname -s 2>/dev/null`" != Darwin || install_name_tool -id $$PWD/build/libagcosmosdaemon.so build/libagcosmosdaemon.so

go-mod-cache: ../../go.sum
	@echo "--> Download go modules to local cache"
	@go mod download

../../go.sum: ../../go.mod
	@echo "--> Ensure dependencies have not been modified"
	GO111MODULE=on go mod verify

###############################################################################
###                           Protobuf                                    ###
###############################################################################

proto-gen: proto-tools
	./scripts/protocgen.sh

proto-lint: proto-tools
	buf check lint --error-format=json

proto-check-breaking: proto-tools
	buf check breaking --against-input '.git#branch=master'

TMVER = v0.34.3
COSMOSVER = v0.41.0

TM_URL           = https://raw.githubusercontent.com/tendermint/tendermint/$(TMVER)/proto/tendermint
GOGO_PROTO_URL   = https://raw.githubusercontent.com/regen-network/protobuf/cosmos
IBC_PROTO_URL = https://raw.githubusercontent.com/cosmos/cosmos-sdk/$(COSMOSVER)/proto/ibc/core
COSMOS_SDK_PROTO_URL = https://raw.githubusercontent.com/cosmos/cosmos-sdk/$(COSMOSVER)/proto/cosmos/base

GOGO_PROTO_TYPES  = third_party/proto/gogoproto
IBC_CHANNEL_TYPES = third_party/proto/ibc/core/channel/v1
IBC_CLIENT_TYPES = third_party/proto/ibc/core/client/v1
SDK_QUERY_TYPES  	= third_party/proto/cosmos/base/query/v1beta1

proto-update-deps:
	mkdir -p $(GOGO_PROTO_TYPES)
	curl -sSL $(GOGO_PROTO_URL)/gogoproto/gogo.proto > $(GOGO_PROTO_TYPES)/gogo.proto

	mkdir -p $(IBC_CHANNEL_TYPES)
	curl -sSL $(IBC_PROTO_URL)/channel/v1/channel.proto > $(IBC_CHANNEL_TYPES)/channel.proto

	mkdir -p $(IBC_CLIENT_TYPES)
	curl -sSL $(IBC_PROTO_URL)/client/v1/client.proto > $(IBC_CLIENT_TYPES)/client.proto

	mkdir -p $(SDK_QUERY_TYPES)
	curl -sSL $(COSMOS_SDK_PROTO_URL)/query/v1beta1/pagination.proto > $(SDK_QUERY_TYPES)/pagination.proto


UNAME_S ?= $(shell uname -s)
UNAME_M ?= $(shell uname -m)

BUF_VERSION ?= 0.11.0

PROTOC_VERSION ?= 3.11.2
ifeq ($(UNAME_S),Linux)
  PROTOC_ZIP ?= protoc-${PROTOC_VERSION}-linux-x86_64.zip
endif
ifeq ($(UNAME_S),Darwin)
  PROTOC_ZIP ?= protoc-${PROTOC_VERSION}-osx-x86_64.zip
endif

proto-tools: proto-tools-stamp buf

proto-tools-stamp:
	echo "Installing protoc compiler..."
	(cd /tmp; \
	curl -OL "https://github.com/protocolbuffers/protobuf/releases/download/v${PROTOC_VERSION}/${PROTOC_ZIP}"; \
	unzip -o ${PROTOC_ZIP} -d ${BIN}/.. bin/protoc 'include/*'; \
	rm -f ${PROTOC_ZIP})

	echo "Installing protoc-gen-gocosmos..."
	go install github.com/regen-network/cosmos-proto/protoc-gen-gocosmos

	# Create dummy file to satisfy dependency and avoid
	# rebuilding when this Makefile target is hit twice
	# in a row
	touch $@

buf: buf-stamp

buf-stamp:
	echo "Installing buf..."
	curl -sSL \
    "https://github.com/bufbuild/buf/releases/download/v${BUF_VERSION}/buf-${UNAME_S}-${UNAME_M}" \
    -o "${BIN}/buf" && \
	chmod +x "${BIN}/buf"

	touch $@

tools-clean:
	rm -f proto-tools-stamp buf-stamp
