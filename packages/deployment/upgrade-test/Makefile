REPOSITORY = agoric/upgrade-test
BOOTSTRAP_MODE?=main
TARGET?=agoric-upgrade-11
dockerLabel?=$(TARGET)
ifdef TMUX_CC
	tmuxCC=1
else
	tmuxCC=0
endif
@echo target: $(TARGET)

local_sdk:
	(cd ../ && make docker-build-sdk)

agoric-upgrade-7-2:
	docker build --build-arg BOOTSTRAP_MODE=$(BOOTSTRAP_MODE) --progress=plain --target agoric-upgrade-7-2 -t $(REPOSITORY):agoric-upgrade-7-2 -f Dockerfile upgrade-test-scripts

agoric-upgrade-8: agoric-upgrade-7-2
	docker build --build-arg BOOTSTRAP_MODE=$(BOOTSTRAP_MODE) --progress=plain --target agoric-upgrade-8 -t $(REPOSITORY):agoric-upgrade-8 -f Dockerfile upgrade-test-scripts

agoric-upgrade-8-1: agoric-upgrade-8
	docker build --build-arg BOOTSTRAP_MODE=$(BOOTSTRAP_MODE) --progress=plain --target agoric-upgrade-8-1 -t $(REPOSITORY):agoric-upgrade-8-1 -f Dockerfile upgrade-test-scripts

agoric-upgrade-9: agoric-upgrade-8-1
	docker build --build-arg BOOTSTRAP_MODE=$(BOOTSTRAP_MODE) --progress=plain --target agoric-upgrade-9 -t $(REPOSITORY):agoric-upgrade-9 -f Dockerfile upgrade-test-scripts

agoric-upgrade-10: agoric-upgrade-9
	docker build --build-arg BOOTSTRAP_MODE=$(BOOTSTRAP_MODE) --progress=plain --target agoric-upgrade-10 -t $(REPOSITORY):agoric-upgrade-10 -f Dockerfile upgrade-test-scripts

agoric-upgrade-11: agoric-upgrade-10
	docker build --build-arg BOOTSTRAP_MODE=$(BOOTSTRAP_MODE) --progress=plain --target agoric-upgrade-11 -t $(REPOSITORY):agoric-upgrade-11 -f Dockerfile upgrade-test-scripts

# build main bootstrap
build: $(TARGET)

# build test bootstrap
build_test: BOOTSTRAP_MODE=test
build_test: $(TARGET)

run:
	docker run --rm -it -e "DEST=1" -e "TMUX_USE_CC=$(tmuxCC)" -p 26656:26656 -p 26657:26657 -p 1317:1317 --entrypoint "/usr/src/agoric-sdk/upgrade-test-scripts/start_to_to.sh" -v "$${PWD}:/workspace" $(REPOSITORY):$(dockerLabel)

.PHONY: local_sdk agoric-upgrade-7-2 agoric-upgrade-8 agoric-upgrade-8-1 agoric-upgrade-9 agoric-upgrade-10 agoric-upgrade-11 build build_test run
