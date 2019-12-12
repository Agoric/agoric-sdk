REPOSITORY = agoric/cosmic-swingset
REPOSITORY_SDK = agoric/agoric-sdk
SS := ../cosmic-swingset/
TAG := $(shell test ! -f package.json || sed -ne 's/.*"version": "\(.*\)".*/\1/p' package.json)
DO_PUSH_LATEST :=

docker-build: docker-build-base docker-build-sdk docker-build-solo \
	docker-build-pserver docker-build-setup docker-build-setup-solo

docker-build-sdk:
	docker build -t $(REPOSITORY_SDK):latest --file=Dockerfile.sdk ../..

docker-build-setup:
	docker build -t $(REPOSITORY)-setup:latest .

docker-build-base:
	hash=`git rev-parse --short HEAD`; \
	  dirty=`git diff --quiet || echo -dirty`; \
	  echo "$$hash$$dirty" > $(SS)lib/git-revision.txt
	docker build -t $(REPOSITORY):latest $(SS)

docker-build-pserver:
	docker build -t $(REPOSITORY)-pserver:latest $(SS)provisioning-server

docker-build-solo:
	docker build -t $(REPOSITORY)-solo:latest $(SS)lib/ag-solo

docker-build-setup-solo:
	docker build -t $(REPOSITORY)-setup-solo:latest $(SS)setup-solo

docker-push: docker-push-base docker-push-solo docker-push-setup \
	docker-push-pserver docker-push-setup-solo

docker-push-setup:
	docker tag $(REPOSITORY)-setup:latest $(REPOSITORY)-setup:$(TAG)
	$(DO_PUSH_LATEST) docker push $(REPOSITORY)-setup:latest
	docker push $(REPOSITORY)-setup:$(TAG)

docker-push-base:
	docker tag $(REPOSITORY_SDK):latest $(REPOSITORY_SDK):$(TAG)
	$(DO_PUSH_LATEST) docker push $(REPOSITORY_SDK):latest
	docker push $(REPOSITORY_SDK):$(TAG)

docker-push-pserver:
	docker tag $(REPOSITORY)-pserver:latest $(REPOSITORY)-pserver:$(TAG)
	$(DO_PUSH_LATEST) docker push $(REPOSITORY)-pserver:latest
	docker push $(REPOSITORY)-pserver:$(TAG)

docker-push-solo:
	docker tag $(REPOSITORY)-solo:latest $(REPOSITORY)-solo:$(TAG)
	$(DO_PUSH_LATEST) docker push $(REPOSITORY)-solo:latest
	docker push $(REPOSITORY)-solo:$(TAG)

docker-push-setup-solo:
	docker tag $(REPOSITORY)-setup-solo:latest $(REPOSITORY)-setup-solo:$(TAG)
	$(DO_PUSH_LATEST) docker push $(REPOSITORY)-setup-solo:latest
	docker push $(REPOSITORY)-setup-solo:$(TAG)
