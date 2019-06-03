ARG TAG=latest
FROM agoric/cosmic-swingset:$TAG

# Install Terraform.
ARG TERRAFORM_VERSION=0.11.14
RUN curl https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip > terraform.zip && \
    unzip -d /usr/local/bin/ terraform.zip && rm -f terraform.zip

# Install Ansible.
RUN echo 'deb http://ppa.launchpad.net/ansible/ansible/ubuntu trusty main' >> /etc/apt/sources.list && \
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 93C4A3FD7BB9C367 && \
    apt-get update -y && \
    apt-get install -y ansible && \
    apt-get clean -y

WORKDIR /usr/src/app
RUN ln -sf $PWD/bin/ag-setup-cosmos /usr/local/bin/
COPY . setup/

WORKDIR /usr/src/app/chains

ENTRYPOINT [ "ag-setup-cosmos" ]
