REPOSITORY = agoric/upgrade-test

build:
	docker build --progress=plain -t $(REPOSITORY):latest -f Dockerfile upgrade-test-scripts

run:
	docker run -it -e "DEST=1" -v "$$(PWD):/workspace" --entrypoint bash $(REPOSITORY):latest
