REPOSITORY = ghcr.io/agoric/cosmic-swingset
REPOSITORY_SDK = ghcr.io/agoric/agoric-sdk
SS := ../cosmic-swingset/
DOCKER_BUILD ?= docker build

TAG := unreleased

default: docker-build

docker-show-fat:
	date > show-fat-bust-cache.stamp
	$(DOCKER_BUILD) --file=Dockerfile.show-fat ../..

docker-build: docker-build-sdk docker-build-solo \
	docker-build-setup docker-build-ssh-node

docker-build-sdk:
	bargs=`node ../xsnap/src/build.js --show-env | sed -e 's/^/ --build-arg=/'`; \
	$(DOCKER_BUILD) $$bargs \
		-t $(REPOSITORY_SDK):$(TAG) --file=Dockerfile.sdk ../..
	docker tag $(REPOSITORY_SDK):$(TAG) $(REPOSITORY_SDK):latest

docker-build-setup:
	$(DOCKER_BUILD) --build-arg=TAG=$(TAG)  -t $(REPOSITORY)-setup:$(TAG) .
	docker tag $(REPOSITORY)-setup:$(TAG) $(REPOSITORY)-setup:latest

docker-build-solo:
	$(DOCKER_BUILD) --build-arg=TAG=$(TAG) -t $(REPOSITORY)-solo:$(TAG) ../solo
	docker tag $(REPOSITORY)-solo:$(TAG) $(REPOSITORY)-solo:latest

docker-build-ssh-node:
	$(DOCKER_BUILD) --build-arg=TAG=$(TAG)  -t ghcr.io/agoric/ssh-node:$(TAG) --file=Dockerfile.ssh-node ./docker
	docker tag ghcr.io/agoric/ssh-node:$(TAG) ghcr.io/agoric/ssh-node:latest

# ./docker is an emptyish directory.
docker-build-ibc-alpha:
	$(DOCKER_BUILD) --build-arg=SDK_TAG=$(TAG) -t $(REPOSITORY_SDK):ibc-alpha --file=Dockerfile.ibc-alpha ./docker
