MODDABLE=$(PWD)/moddable
TOOLS=$(MODDABLE)/build/bin/lin/release/

build/bin/lin/debug/xs-vat-worker: build $(TOOLS)/mcconfig moddable/xs/platforms/lin_xs_cli.c compartmap.json manifest.json
	ROOT=$(ROOT) PATH=$(TOOLS):$$PATH MODDABLE=$(MODDABLE) mcconfig -o build -p x-cli-lin -m -d

compartmap.json: src/vatWorker.js package.json
	node -r esm tools/findmods.js $(ROOT) src/vatWorker.js >$@

build:
	mkdir -p build

moddable/xs/platforms/lin_xs_cli.c: moddable/xs/platforms/lin_xs.h
	touch $@

./moddable/README.md:
	git submodule init
	git submodule update

moddable/xs/platforms/lin_xs.h: /usr/include/glib-2.0/gio/gio.h

/usr/include/glib-2.0/gio/gio.h:
	sudo apt-get -y update && sudo apt-get -y install libgio2.0-dev

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
