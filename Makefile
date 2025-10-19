# Default port can be overridden: `make dev PORT=3000`
PORT ?= 8080

.PHONY: dev serve-python

dev:
	npx http-server . --port $(PORT) --cors
