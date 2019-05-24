REPOSITORY = agoric/cosmic-swingset
TAG := $(shell sed -ne 's/.*"version": "\(.*\)".*/\1/p' package.json)

include Makefile.ledger
all: build install

docker-install:
	install -m 755 ./ssd ./sscli /usr/local/bin/

docker-build:
	docker build -t $(REPOSITORY):latest .
	docker tag $(REPOSITORY):latest $(REPOSITORY):$(TAG)

docker-push:
	docker push $(REPOSITORY):latest
	docker push $(REPOSITORY):$(TAG)

compile-go: go.sum
	GO111MODULE=on go build -v -buildmode=c-shared -o lib/libss.so lib/ss.go
	-install_name_tool -id `pwd`/lib/libss.so lib/libss.so

build: compile-go compile-node

compile-node:
	npm run build

install: go.sum
	# Not needed, because we librarify ./cmd/ssd as ./lib/libss.so
	#GO111MODULE=on go install -tags "$(build_tags)" ./cmd/ssd
	GO111MODULE=on go install -v -tags "$(build_tags)" ./cmd/sscli

go.sum: go.mod
	@echo "--> Ensure dependencies have not been modified"
	GO111MODULE=on go mod verify
