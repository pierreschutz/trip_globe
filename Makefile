# Default port can be overridden: `make dev PORT=3000`
PORT ?= 8080

.PHONY: dev serve-python deploy-prod deploy-staging

dev:
	npx http-server . --port $(PORT) --cors --cache -1

serve-python:
	python3 -m http.server $(PORT)

deploy-prod:
	firebase deploy --only hosting:prod

deploy-staging:
	firebase deploy --only hosting:staging
