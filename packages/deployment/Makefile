REPOSITORY = agoric/cosmic-swingset
REPOSITORY_SDK = agoric/agoric-sdk
SS := ../cosmic-swingset/
TAG := $(shell test ! -f ../../package.json || sed -ne 's/.*"version": "\(.*\)".*/\1/p' ../../package.json)

# Don't push alpha tags as ":$(TAG)".
DONT_PUSH_LATEST := $(if $(findstring -,$(TAG)),:,)

docker-show-fat:
	date > show-fat-bust-cache.stamp
	docker build --file=Dockerfile.show-fat ../..

docker-build: docker-build-base docker-build-sdk docker-build-solo \
	docker-build-setup docker-build-deployment

docker-build-sdk:
	docker build --build-arg=SWINGSET_TAG=$(TAG) -t $(REPOSITORY_SDK):$(TAG) --file=Dockerfile.sdk ../..

docker-build-setup:
	docker build -t $(REPOSITORY)-setup:$(TAG) .

docker-build-base:
	hash=`git rev-parse --short HEAD`; \
	  dirty=`git diff --quiet || echo -dirty`; \
	  echo "$$hash$$dirty" > $(SS)lib/git-revision.txt
	docker build -t $(REPOSITORY):$(TAG) $(SS)

docker-build-solo:
	docker build -t $(REPOSITORY)-solo:$(TAG) $(SS)lib/ag-solo

docker-build-deployment:
	docker build -t agoric/deployment:$(TAG) --file=Dockerfile.deployment ./docker

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
	$(DONT_PUSH_LATEST) docker tag $(REPOSITORY)-setup:$(TAG) $(REPOSITORY)-setup:latest
	$(DONT_PUSH_LATEST) docker push $(REPOSITORY)-setup:latest
	docker push $(REPOSITORY)-setup:$(TAG)

docker-push-base:
	$(DONT_PUSH_LATEST) docker tag $(REPOSITORY_SDK):$(TAG) $(REPOSITORY_SDK):latest
	$(DONT_PUSH_LATEST) docker push $(REPOSITORY_SDK):latest
	docker push $(REPOSITORY_SDK):$(TAG)

docker-push-solo:
	$(DONT_PUSH_LATEST) docker tag $(REPOSITORY)-solo:$(TAG) $(REPOSITORY)-solo:latest
	$(DONT_PUSH_LATEST) docker push $(REPOSITORY)-solo:latest
	docker push $(REPOSITORY)-solo:$(TAG)

docker-push-deployment:
	$(DONT_PUSH_LATEST) docker tag agoric/deployment:$(TAG) agoric/deployment:latest
	$(DONT_PUSH_LATEST) docker push agoric/deployment:latest
	docker push $(REPOSITORY)-solo:$(TAG)
