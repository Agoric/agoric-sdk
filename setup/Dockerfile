ARG TAG=latest
FROM golang:stretch AS go-build

WORKDIR /usr/src/journalbeat
RUN apt-get update && apt-get install libsystemd-dev
RUN go get github.com/mheese/journalbeat

FROM agoric/cosmic-swingset:$TAG

# Install Terraform.
ARG TERRAFORM_VERSION=0.11.14
RUN curl https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip > terraform.zip && \
    unzip -d /usr/local/bin/ terraform.zip && rm -f terraform.zip

# Install Ansible.
RUN echo 'deb http://ppa.launchpad.net/ansible/ansible/ubuntu trusty main' >> /etc/apt/sources.list && \
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 93C4A3FD7BB9C367 && \
    apt-get update -y && \
    apt-get install -y ansible rsync curl sudo gnupg2 && \
    apt-get clean -y

# Copy journalbeat for logging support
COPY --from=go-build /go/bin/journalbeat /usr/local/bin/

WORKDIR /usr/src/app
RUN ln -sf $PWD/setup/ag-setup-cosmos /usr/local/bin/
COPY package*.json setup/
RUN cd setup && npm install --production

# Add the provisioning server, so we can deploy it via Ansible.
COPY --from=agoric/cosmic-swingset-pserver /usr/src/app/ve3/ /usr/src/app/ve3/
COPY --from=agoric/cosmic-swingset-solo /usr/src/app/lib/ag-solo/ /usr/src/app/lib/ag-solo/

COPY . setup/
WORKDIR /usr/src/app/chains

ENTRYPOINT [ "ag-setup-cosmos" ]
