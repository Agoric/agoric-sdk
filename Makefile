include Makefile.ledger
all: build install

compile-go: go.sum
	GO111MODULE=on go build -buildmode=c-shared -o lib/libcoss.so lib/coss.go

build: compile-go
	npm run build
	-install_name_tool -change libcoss.so `pwd`/lib/libcoss.so build/Release/coss.node 

install: go.sum
	GO111MODULE=on go install -tags "$(build_tags)" ./cmd/nsd
	GO111MODULE=on go install -tags "$(build_tags)" ./cmd/nscli

go.sum: go.mod
	@echo "--> Ensure dependencies have not been modified"
	GO111MODULE=on go mod verify
