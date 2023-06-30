all: clean hugo

help: # Show this help.
	@grep -E '^[a-zA-Z0-9 -]+:.*#'  Makefile | sort | while read -r l; do printf "\033[1;32m$$(echo $$l | cut -f 1 -d':')\033[00m:$$(echo $$l | cut -f 2- -d'#')\n"; done

env: # Setup dev environment.
	@./setup

clean: # Cleaning static resources
	@rm -rf docs resources; git checkout static/js/searchcontent.js

buildindex: # Building search index
	@cd index && npm ci && node index.js >../static/js/searchcontent.js && cd ..

hugo: buildindex # Building static site in the docs folder
	@hugo --disableKinds=taxonomy
	@rm -rf docs/tags

server: buildindex # Running hugo server - showing all content (inc drafts)
	@hugo server --disableKinds=taxonomy --buildDrafts --buildExpired --buildFuture
