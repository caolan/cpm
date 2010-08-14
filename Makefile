all:
	git submodule init
	git submodule update

test:
	./scripts/test.js

.PHONY: all test
