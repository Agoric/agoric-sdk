REPOSITORY = agoric/upgrade-test
# use :dev (latest prerelease image) unless we build local sdk
DEST_IMAGE ?= $(if $(findstring local_sdk,$(MAKECMDGOALS)),ghcr.io/agoric/agoric-sdk:latest,ghcr.io/agoric/agoric-sdk:dev)
BOOTSTRAP_MODE?=main
TARGET?=agoric-upgrade-13
dockerLabel?=$(TARGET)
@echo target: $(TARGET)

local_sdk:
	(cd ../ && make docker-build-sdk)

BUILD = docker build --progress=plain $(BUILD_OPTS) \
	--build-arg BOOTSTRAP_MODE=$(BOOTSTRAP_MODE) --build-arg DEST_IMAGE=$(DEST_IMAGE) \
	-f Dockerfile upgrade-test-scripts

propose-agoric-upgrade-13:
	$(BUILD) --target propose-agoric-upgrade-13 -t $(REPOSITORY):propose-agoric-upgrade-13$(TAG_SUFFIX)

agoric-upgrade-13: propose-agoric-upgrade-13
	$(BUILD) --target agoric-upgrade-13 -t $(REPOSITORY):agoric-upgrade-13$(TAG_SUFFIX)

# build main bootstrap
build: $(TARGET)

# build test bootstrap
build_test: BOOTSTRAP_MODE=test
build_test: $(TARGET)

DEBUG ?= SwingSet:ls,SwingSet:vat
RUN = docker run --rm -it \
	-p 26656:26656 -p 26657:26657 -p 1317:1317 \
	-v "$${PWD}:/workspace" \
	-e "DEBUG=$(DEBUG)"

run:
	$(RUN) -e "DEST=1" \
		--entrypoint /usr/src/agoric-sdk/upgrade-test-scripts/start_to_to.sh \
		 $(REPOSITORY):$(dockerLabel)

run_test:
	$(RUN) -e "DEST=0" $(REPOSITORY):$(dockerLabel)

shell:
	docker exec -it `docker ps --latest --format '{{json .}}' | jq -r .Names` bash

.PHONY: local_sdk agoric-upgrade-13 build build_test run
