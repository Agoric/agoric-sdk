FROM debian:stretch
# MAINTAINER Tasos Latsas "tlatsas@kodama.gr"
LABEL maintainer="mfig@agoric.com"

RUN apt-get update \
    && apt-get install -y init openssh-server sudo curl python python3-venv python3-dev \
    && apt-get clean

RUN useradd --create-home --shell /bin/bash vagrant
RUN echo root:vagrant | chpasswd
RUN echo vagrant:vagrant | chpasswd

RUN mkdir -m 0700 /home/vagrant/.ssh
RUN curl https://raw.githubusercontent.com/hashicorp/vagrant/master/keys/vagrant.pub \
    > /home/vagrant/.ssh/authorized_keys
RUN chown -R vagrant:vagrant /home/vagrant/.ssh
RUN chmod 0600 /home/vagrant/.ssh/authorized_keys

RUN sed --regexp-extended --in-place \
    's/^session\s+required\s+pam_loginuid.so$/session optional pam_loginuid.so/' \
    /etc/pam.d/sshd

RUN echo 'vagrant ALL=(ALL) NOPASSWD: ALL' > /etc/sudoers.d/01_vagrant
RUN chmod 0400 /etc/sudoers.d/01_vagrant

RUN ln -sf /vagrant/cosmic-swingset /usr/src/app

CMD ["/sbin/init"]
