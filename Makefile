PACKAGE = cpm
NODEJS = $(if $(shell test -f /usr/bin/nodejs && echo "true"),nodejs,node)

PREFIX ?= /usr/local
BINDIR ?= $(PREFIX)/bin
DATADIR ?= $(PREFIX)/share
LIBDIR ?= $(PREFIX)/lib
NODEJSLIBDIR ?= $(LIBDIR)/$(NODEJS)

BUILDDIR = dist

$(shell if [ ! -d $(BUILDDIR) ]; then mkdir $(BUILDDIR); fi)

all: build
	git submodule init
	git submodule update

build: stamp-build

stamp-build: $(wildcard  deps/* lib/*)
	touch $@;
	mkdir -p $(BUILDDIR)/cpm
	cp -R deps lib/* $(BUILDDIR)/cpm
	find $(BUILDDIR)/cpm/ -type f | xargs sed -i 's/\.\.\/deps/.\/deps/'
	printf '#!/bin/sh\n$(NODEJS) $(NODEJSLIBDIR)/$(PACKAGE)/cli.js $$@' > $(BUILDDIR)/cpm.sh
	printf "module.exports = require('$(PACKAGE)/cpm')" > $(BUILDDIR)/cpm.js

test:
	node ./deps/nodeunit/lib/cli.js test

install: build
	install --directory $(NODEJSLIBDIR)
	cp -a $(BUILDDIR)/cpm $(NODEJSLIBDIR)
	install --mode=0644 $(BUILDDIR)/cpm.js $(NODEJSLIBDIR)
	install --mode=0755 $(BUILDDIR)/cpm.sh $(BINDIR)/cpm

uninstall:
	rm -rf $(NODEJSLIBDIR)/cpm $(NODEJSLIBDIR)/cpm.js $(BINDIR)/cpm

clean:
	rm -rf $(BUILDDIR) stamp-build

.PHONY: all test
