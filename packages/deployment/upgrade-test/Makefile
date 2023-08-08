REPOSITORY = agoric/upgrade-test
# use :dev (latest prerelease image) unless we build local sdk
DEST_IMAGE ?= $(if $(findstring local_sdk,$(MAKECMDGOALS)),ghcr.io/agoric/agoric-sdk:latest,ghcr.io/agoric/agoric-sdk:dev)
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

BUILD = docker build --progress=plain $(BUILD_OPTS) \
	--build-arg BOOTSTRAP_MODE=$(BOOTSTRAP_MODE) --build-arg DEST_IMAGE=$(DEST_IMAGE) \
	-f Dockerfile upgrade-test-scripts

agoric-upgrade-7-2:
	$(BUILD) --target agoric-upgrade-7-2 -t $(REPOSITORY):agoric-upgrade-7-2

agoric-upgrade-8: agoric-upgrade-7-2
	$(BUILD) --target agoric-upgrade-8 -t $(REPOSITORY):agoric-upgrade-8

agoric-upgrade-8-1: agoric-upgrade-8
	$(BUILD) --target agoric-upgrade-8-1 -t $(REPOSITORY):agoric-upgrade-8-1

agoric-upgrade-9: agoric-upgrade-8-1
	$(BUILD) --target agoric-upgrade-9 -t $(REPOSITORY):agoric-upgrade-9

agoric-upgrade-10: agoric-upgrade-9
	$(BUILD) --target agoric-upgrade-10 -t $(REPOSITORY):agoric-upgrade-10

agoric-upgrade-10-to-11: agoric-upgrade-10
	$(BUILD) --target agoric-upgrade-10-to-11 -t $(REPOSITORY):agoric-upgrade-10-to-11

agoric-upgrade-11: agoric-upgrade-10-to-11
	$(BUILD) --target agoric-upgrade-11 -t $(REPOSITORY):agoric-upgrade-11

# build main bootstrap
build: $(TARGET)

# build test bootstrap
build_test: BOOTSTRAP_MODE=test
build_test: $(TARGET)

DEBUG ?= SwingSet:ls,SwingSet:vat
RUN = docker run --rm -it \
	-p 26656:26656 -p 26657:26657 -p 1317:1317 \
	-v "$${PWD}:/workspace" \
	-e "DEST=1" -e "DEBUG=$(DEBUG)"

run:
	$(RUN) -e "TMUX_USE_CC=$(tmuxCC)" \
		--entrypoint /usr/src/agoric-sdk/upgrade-test-scripts/start_to_to.sh \
		 $(REPOSITORY):$(dockerLabel)

run_bash:
	$(RUN) --entrypoint /bin/bash $(REPOSITORY):$(dockerLabel)

.PHONY: local_sdk agoric-upgrade-7-2 agoric-upgrade-8 agoric-upgrade-8-1 agoric-upgrade-9 agoric-upgrade-10 agoric-upgrade-11 build build_test run
