all:
	git submodule init
	git submodule update

test:
	node ./deps/nodeunit/lib/cli.js test

.PHONY: all test
