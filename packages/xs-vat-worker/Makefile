MODDABLE=$(PWD)/moddable
TOOLS=$(MODDABLE)/build/bin/lin/release/
NODE_MODULES=$(PWD)/node_modules
ROOT=$(PWD)/../..

.PHONY: all

all:
	$(MAKE) build
	@echo "### building XS tools (headless)"
	$(MAKE) $(TOOLS)/mcconfig
	@echo "### building compartmap.json"
	$(MAKE) compartmap.json
	cat compartmap.json
	@echo "### building xs-worker"
	$(MAKE) build/bin/lin/debug/xs-vat-worker


build/bin/lin/debug/xs-vat-worker: build $(TOOLS)/mcconfig moddable/xs/platforms/lin_xs_cli.c compartmap.json manifest.json
	ROOT=$(ROOT) PATH=$(TOOLS):$$PATH MODDABLE=$(MODDABLE) mcconfig -o build -p x-cli-lin -m -d

compartmap.json: src/vatWorker.js package.json
	node -r esm tools/findmods.js $(ROOT) src/vatWorker.js >$@

build:
	mkdir -p build

moddable/xs/platforms/lin_xs_cli.c: moddable/xs/platforms/lin_xs.h

./moddable/README.md:
	git submodule init
	git submodule update

moddable/xs/platforms/lin_xs.h: /usr/include/glib-2.0/gio/gio.h

.PHONY: install-deps
install-deps:
	$(MAKE) install-gio

.PHONY: install-gio
/usr/include/glib-2.0/gio/gio.h:
	@echo "GIO not installed, need root to run apt-get install libglib2.0-dev"
	@echo "feel free to stop now and run `make install-gio` directly, then rebuild"
	$(MAKE) install-gio

# ubuntu 'bionic' puts gio in libglib2.0-dev
install-gio:
	sudo apt-get -y update && sudo apt-get -y install libglib2.0-dev

$(TOOLS)/mcconfig:
	cd moddable && \
	export MODDABLE=$$PWD && echo MODDABLE=$$MODDABLE && \
	cd build/makefiles/lin && \
	make headless

clean:
	rm -rf build

realclean:
	rm -rf build
	cd moddable/build/makefiles/lin && make clean
