REPOSITORY = ghcr.io/agoric/cosmic-swingset
REPOSITORY_SDK = ghcr.io/agoric/agoric-sdk
SS := ../cosmic-swingset/

TAG := unreleased
GIT_REVISION := $(shell hash=$$(git rev-parse --short HEAD); \
	dirty=`git diff --quiet 2>/dev/null || echo -dirty`; \
	echo "$$hash$$dirty")

default: docker-build

docker-show-fat:
	date > show-fat-bust-cache.stamp
	docker build --file=Dockerfile.show-fat ../..

docker-build: docker-build-sdk docker-build-solo \
	docker-build-setup docker-build-ssh-node

docker-build-sdk:
	bargs=`node ../xsnap/src/build.js --show-env | sed -e 's/^/ --build-arg=/'`; \
	docker build $$bargs --build-arg=GIT_REVISION=$(GIT_REVISION) \
		-t $(REPOSITORY_SDK):$(TAG) --file=Dockerfile.sdk ../..
	docker tag $(REPOSITORY_SDK):$(TAG) $(REPOSITORY_SDK):latest

docker-build-setup:
	docker build --build-arg=TAG=$(TAG)  -t $(REPOSITORY)-setup:$(TAG) .
	docker tag $(REPOSITORY)-setup:$(TAG) $(REPOSITORY)-setup:latest

docker-build-solo:
	docker build --build-arg=TAG=$(TAG) -t $(REPOSITORY)-solo:$(TAG) ../solo
	docker tag $(REPOSITORY)-solo:$(TAG) $(REPOSITORY)-solo:latest

docker-build-ssh-node:
	docker build --build-arg=TAG=$(TAG)  -t ghcr.io/agoric/ssh-node:$(TAG) --file=Dockerfile.ssh-node ./docker
	docker tag ghcr.io/agoric/ssh-node:$(TAG) ghcr.io/agoric/ssh-node:latest

# ./docker is an emptyish directory.
docker-build-ibc-alpha:
	docker build --build-arg=SDK_TAG=$(TAG) -t $(REPOSITORY_SDK):ibc-alpha --file=Dockerfile.ibc-alpha ./docker
