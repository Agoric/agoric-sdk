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
	GO111MODULE=on go build -v -buildmode=c-shared -o lib/libcoss.so lib/coss.go
	-install_name_tool -id `pwd`/lib/libcoss.so lib/libcoss.so

build: compile-go compile-node

compile-node:
	npm run build

install: go.sum
	# Not needed, because we librarify ./cmd/cossd as ./lib/libcoss.so
	#GO111MODULE=on go install -tags "$(build_tags)" ./cmd/cossd
	GO111MODULE=on go install -v -tags "$(build_tags)" ./cmd/cosscli

go.sum: go.mod
	@echo "--> Ensure dependencies have not been modified"
	GO111MODULE=on go mod verify
