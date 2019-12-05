# -*- mode: ruby -*-
# vi: set ft=ruby :
#
# Vagrant box for Debian with agoric-sdk development dependencies
#
# You can use this if you're familiar with Vagrant and you don't
# want to (or can't) install all the development tools (Node.js,
# yarn, golang), on your host environment.
#
# use one of:
#  vagrant up --provider=docker
#  vagrant up --provider=virtualbox

TERRAFORM_VERSION = "0.11.14"
NODE_VERSION = "12.x"
GO_VERSION = "1.13.4"
#DOCKER_VERSION = "=17.09.0~ce-0~debian"
DOCKER_VERSION = ""

CURRENT_DIR = File.dirname(__FILE__)

$script = <<SCRIPT

echo "Appending DOCKER_VOLUMES to /etc/environment"
echo "DOCKER_VOLUMES=#{CURRENT_DIR}:/vagrant" >> /etc/environment

export DEBIAN_FRONTEND=noninteractive

apt-get update && apt-get install -y --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    unzip \
    curl \
    gnupg2 dirmngr \
    software-properties-common \
    vim

echo "Installing Node.js #{NODE_VERSION}"
curl -sL https:/deb.nodesource.com/setup_#{NODE_VERSION} | bash -
# apt-get install -y nodejs build-essential git

curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
# sudo apt-get update && sudo apt-get install yarn

echo "Installing Go #{GO_VERSION}"
curl https://dl.google.com/go/go#{GO_VERSION}.linux-amd64.tar.gz > go#{GO_VERSION}.linux-amd64.tar.gz
tar -C /usr/local -zxf go#{GO_VERSION}.linux-amd64.tar.gz
cat > /etc/profile.d/99-golang.sh <<\EOF
GOROOT=/usr/local/go
GOPATH=\\\$HOME/go
PATH=\\\$GOPATH/bin:\\\$GOROOT/bin:\\\$PATH
export GOROOT GOPATH
EOF

echo "Installing Terraform #{TERRAFORM_VERSION}"
curl https://releases.hashicorp.com/terraform/#{TERRAFORM_VERSION}/terraform_#{TERRAFORM_VERSION}_linux_amd64.zip > terraform-#{TERRAFORM_VERSION}.zip
# unzip -d /usr/local/bin/ terraform-#{TERRAFORM_VERSION}.zip

echo "Installing Ansible"
add-apt-repository \
    'deb http://ppa.launchpad.net/ansible/ansible/ubuntu trusty main'
apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 93C4A3FD7BB9C367

echo "Installing docker via apt repo..."
curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo "$ID")/gpg | sudo apt-key add -
apt-key fingerprint 0EBFCD88

add-apt-repository \
    "deb [arch=amd64] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") \
    $(lsb_release -cs) \
    stable"

#apt-get update && apt-get install -y --no-install-recommends \
#    docker-ce#{DOCKER_VERSION}

apt-get update && apt-get install -y nodejs yarn build-essential git ansible rsync build-essential git docker-ce#{DOCKER_VERSION}
unzip -d /usr/local/bin/ terraform-#{TERRAFORM_VERSION}.zip

echo "Adding vagrant user to docker group..."
groupadd docker &> /dev/null
usermod -aG docker vagrant

set dummy `ls -l /var/run/docker.sock`
docksockgroup="$5"

case $docksockgroup in
docker) ;;
*[a-zA-Z]*)
  echo "Adding vagrant user to $docksockgroup group..."
  usermod -aG $docksockgroup vagrant
  ;;
*)
  echo "Adding vagrant user to docksock group..."
  groupadd docksock --gid $docksockgroup
  usermod -aG docksock vagrant
  ;;
esac

echo "Enjoy! :)"
SCRIPT

def get_ipaddr(hostname, default)
  return Socket::getaddrinfo(hostname, nil)[0][3]
  rescue SocketError
    return default
end

Vagrant.configure("2") do |config|
    config.vm.box = "debian/contrib-stretch64"
    config.vm.hostname = "agoric-sdk"

    private_network_ip = get_ipaddr(config.vm.hostname, "10.10.10.10")
    config.vm.network "private_network", ip: private_network_ip

    config.vm.provision "shell", inline: $script
    config.vm.provision "shell", inline: "echo 'cd /vagrant' >> .bash_profile", privileged: false

    config.vm.post_up_message = \
      "The private network IP address is: #{private_network_ip}\n\n" \
      "To customize, set the host called '#{config.vm.hostname}'\n" \
      "to the desired IP address in your /etc/hosts and run \n" \
      "'vagrant reload'!\n"

    config.vm.provider :virtualbox do |vb|
      vb.name = "agoric-sdk-vb"
    end

    config.vm.provider :docker do |docker, override|
      override.vm.box = nil
      docker.build_dir = "vagrant"
      docker.build_args = ['-t', 'agoric/agoric-sdk:local']
      docker.name = "agoric-sdk-docker"
      docker.ports = ['127.0.0.1:8000:8000', '127.0.0.1:9229:9229']
      docker.remains_running = true
      docker.has_ssh = true
      docker.create_args = ['--tmpfs', '/tmp:exec', '--tmpfs', '/run',
			    '-v', '/sys/fs/cgroup:/sys/fs/cgroup:ro',
          '--volume=ag-solo-state:/vagrant/packages/cosmic-swingset/solo',
          '--volume=ag-setup-cosmos-chains:/vagrant/packages/cosmic-swingset/chains',
          '--volume=ag-cosmos-helper-state:/home/vagrant/.ag-cosmos-helper',
			    '--privileged=true',
			    '-v', '/var/run/docker.sock:/var/run/docker.sock']
    end
end
