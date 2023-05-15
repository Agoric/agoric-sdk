REPOSITORY = agoric/upgrade-test
dockerLabel = latest
ifdef TARGET
buildTargetFlag = --target $(TARGET)
dockerLabel = $(TARGET)
endif
@echo buildTargetFlag: $(buildTargetFlag)

local_sdk:
	(cd ../ && make docker-build-sdk)

build:
	docker build --build-arg BOOTSTRAP_MODE=main --progress=plain $(buildTargetFlag) -t $(REPOSITORY):$(dockerLabel) -f Dockerfile upgrade-test-scripts

build_test:
	docker build --build-arg BOOTSTRAP_MODE=test --progress=plain $(buildTargetFlag) -t $(REPOSITORY):$(dockerLabel) -f Dockerfile upgrade-test-scripts

run:
	docker run --rm -it -e "DEST=1" -p 26656:26656 -p 26657:26657 -p 1317:1317 --entrypoint "/usr/src/agoric-sdk/upgrade-test-scripts/start_to_to.sh" -v "$${PWD}:/workspace" $(REPOSITORY):$(dockerLabel)

