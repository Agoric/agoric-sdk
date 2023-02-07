REPOSITORY = agoric/cosmic-swingset
REPOSITORY_SDK = agoric/agoric-sdk
SS := ../cosmic-swingset/
VERSION := $(shell node -e 'console.log(require("../../package.json").version??"")' 2>/dev/null)

TAG := $(if $(VERSION),$(VERSION),latest)
GIT_REVISION := $(shell hash=$$(git rev-parse --short HEAD); \
	dirty=`git diff --quiet || echo -dirty`; \
	echo "$$hash$$dirty")

# Don't push alpha tags as ":$(TAG)".
ifeq ($(TAG),latest)
DONT_PUSH_LATEST := :
else
DONT_PUSH_LATEST := $(if $(findstring -,$(TAG)),:,)
endif

default: docker-build

docker-show-fat:
	date > show-fat-bust-cache.stamp
	docker build --file=Dockerfile.show-fat ../..

docker-build: docker-build-sdk docker-build-solo \
	docker-build-setup docker-build-deployment

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

docker-build-deployment:
	docker build --build-arg=TAG=$(TAG)  -t agoric/deployment:$(TAG) --file=Dockerfile.deployment ./docker
	docker tag agoric/deployment:$(TAG) agoric/deployment:latest

# Just push $(TAG)
docker-push-only:
	$(MAKE) docker-push DONT_PUSH_LATEST=: TAG=$(TAG)

docker-push: docker-push-base docker-push-solo docker-push-setup \
	docker-push-ibc-alpha docker-push-deployment

# ./docker is an emptyish directory.
docker-build-ibc-alpha:
	docker build --build-arg=SDK_TAG=$(TAG) -t $(REPOSITORY_SDK):ibc-alpha --file=Dockerfile.ibc-alpha ./docker

docker-push-ibc-alpha: docker-build-ibc-alpha
	docker push $(REPOSITORY_SDK):ibc-alpha

docker-push-setup:
	$(DONT_PUSH_LATEST) docker push $(REPOSITORY)-setup:latest
	docker push $(REPOSITORY)-setup:$(TAG)

docker-push-base:
	$(DONT_PUSH_LATEST) docker push $(REPOSITORY_SDK):latest
	docker push $(REPOSITORY_SDK):$(TAG)

docker-push-solo:
	$(DONT_PUSH_LATEST) docker push $(REPOSITORY)-solo:latest
	docker push $(REPOSITORY)-solo:$(TAG)

docker-push-deployment:
	$(DONT_PUSH_LATEST) docker push agoric/deployment:latest
	docker push agoric/deployment:$(TAG)
