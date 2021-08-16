ARG TAG=latest
ARG REPO=agoric/agoric-sdk

# FIXME: Journalbeat compilation is currently broken, but non-essential.
# Removed from the build.
# FROM golang:buster AS go-build

# WORKDIR /usr/src/journalbeat
# RUN apt-get update -y && apt-get install -y libsystemd-dev
# RUN go get github.com/mheese/journalbeat

FROM $REPO:$TAG

# Install Terraform.
ARG TERRAFORM_VERSION=0.11.14
RUN curl https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip > terraform.zip && \
    unzip -d /usr/local/bin/ terraform.zip && rm -f terraform.zip

# Install Ansible.
RUN echo 'deb http://ppa.launchpad.net/ansible/ansible/ubuntu trusty main' >> /etc/apt/sources.list && \
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 93C4A3FD7BB9C367 && \
    apt-get update -y && \
    apt-get install -y ansible rsync curl sudo gnupg2 jq python-jmespath && \
    apt-get clean -y

# # Copy journalbeat for logging support
# COPY --from=go-build /go/bin/journalbeat /usr/local/bin/

WORKDIR /usr/src/agoric-sdk/packages/deployment
RUN ln -sf $PWD/src/entrypoint.js /usr/local/bin/ag-setup-cosmos

WORKDIR /data/chains

ENTRYPOINT [ "ag-setup-cosmos" ]
