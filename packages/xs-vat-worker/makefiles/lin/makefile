.NOTPARALLEL:

PLATFORM = lin

all: debug release

debug:
	make -f xs-vat-worker.mk

release:
	make GOAL=release -f xs-vat-worker.mk

test-cli: debug
	./bin/lin/debug/xsnap -h
	./bin/lin/debug/xsnap -v

test: debug
	PATH=$(PWD)/bin/$(PLATFORM)/debug/:$$PATH sh -c "cd ../../test && bash ./test.sh"
