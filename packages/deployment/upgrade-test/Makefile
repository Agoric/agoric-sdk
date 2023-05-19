REPOSITORY = agoric/upgrade-test
dockerLabel = latest
ifdef TARGET
buildTargetFlag = --target $(TARGET)
dockerLabel = $(TARGET)
endif
@echo buildTargetFlag: $(buildTargetFlag)

local_sdk:
	(cd ../ && make docker-build-sdk)

Dockerfile.assembled:
	BOOTSTRAP_MODE=$(BOOTSTRAP_MODE) yarn assemble

# build main bootstrap
build: 
	rm Dockerfile.assembled || true
	BOOTSTRAP_MODE=main yarn assemble
	docker build --progress=plain $(buildTargetFlag) -t $(REPOSITORY):$(dockerLabel) -f Dockerfile.assembled upgrade-test-scripts

# build test bootstrap
build_test: 
	rm Dockerfile.assembled || true
	BOOTSTRAP_MODE=test yarn assemble
	docker build --progress=plain $(buildTargetFlag) -t $(REPOSITORY):$(dockerLabel) -f Dockerfile.assembled upgrade-test-scripts

run:
	docker run --rm -it -e "DEST=1" -p 26656:26656 -p 26657:26657 -p 1317:1317 --entrypoint "/usr/src/agoric-sdk/upgrade-test-scripts/start_to_to.sh" -v "$${PWD}:/workspace" $(REPOSITORY):$(dockerLabel)

clean:
	rm Dockerfile.assembled || true
