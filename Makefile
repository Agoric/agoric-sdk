 REPOSITORY = michaelfig/cosmic-swingset
TAG := $(shell sed -ne 's/.*"version": "\(.*\)".*/\1/p' package.json)

include Makefile.ledger
all: build install

docker-build:
	docker build -t $(REPOSITORY):latest .
	docker tag $(REPOSITORY):latest $(REPOSITORY):$(TAG)

docker-push:
	docker push $(REPOSITORY):latest
	docker push $(REPOSITORY):$(TAG)

compile-go: go.sum
	GO111MODULE=on go build -buildmode=c-shared -o lib/libcoss.so lib/coss.go

build: compile-go compile-node

compile-node:
	npm run build
	-install_name_tool -change libcoss.so `pwd`/lib/libcoss.so build/Release/coss.node 

install: go.sum
	#GO111MODULE=on go install -tags "$(build_tags)" ./cmd/nsd
	GO111MODULE=on go install -tags "$(build_tags)" ./cmd/cosscli

go.sum: go.mod
	@echo "--> Ensure dependencies have not been modified"
	GO111MODULE=on go mod verify
