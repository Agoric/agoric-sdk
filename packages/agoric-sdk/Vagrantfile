# -*- mode: ruby -*-
# vi: set ft=ruby :
#
# Vagrant box for Debian with cosmic-swingset dependencies
#
# use one of:
#  vagrant up --provider=docker
#  vagrant up --provider=virtualbox

NODE_VERSION = "12.x"
GO_VERSION = "1.12.7"

CURRENT_DIR = File.dirname(__FILE__)

$script = <<SCRIPT

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

echo "Installing Go #{GO_VERSION}"
curl https://dl.google.com/go/go#{GO_VERSION}.linux-amd64.tar.gz > go#{GO_VERSION}.linux-amd64.tar.gz
tar -C /usr/local -zxf go#{GO_VERSION}.linux-amd64.tar.gz
cat > /etc/profile.d/99-golang.sh <<\EOF
GOROOT=/usr/local/go
GOPATH=\\\$HOME/go
PATH=\\\$GOPATH/bin:\\\$GOROOT/bin:\\\$PATH
export GOROOT GOPATH
EOF

apt-get update && apt-get install -y nodejs build-essential git rsync build-essential

cd /vagrant && npm install -g .
echo "Enjoy! :)"
SCRIPT

def get_ipaddr(hostname, default)
  return Socket::getaddrinfo(hostname, nil)[0][3]
  rescue SocketError
    return default
end

Vagrant.configure("2") do |config|
    config.vm.box = "debian/contrib-stretch64"
    config.vm.hostname = "dev-agoric"

    private_network_ip = get_ipaddr(config.vm.hostname, "10.10.10.11")
    config.vm.network "private_network", ip: private_network_ip

    config.vm.provision "shell", inline: $script
    config.vm.provision "shell", inline: "echo 'cd /vagrant/dapps' >> .bash_profile", privileged: false

    config.vm.post_up_message = \
      "The private network IP address is: #{private_network_ip}\n\n" \
      "To customize, set the host called '#{config.vm.hostname}'\n" \
      "to the desired IP address in your /etc/hosts and run \n" \
      "'vagrant reload'!\n"

    config.vm.provider :virtualbox do |vb|
      vb.name = "dev-agoric-vb"
    end

    config.vm.provider :docker do |docker, override|
      override.vm.box = nil
      docker.build_dir = "docker"
      docker.build_args = ['-t', 'agoric/devtools:local']
      docker.name = "dev-agoric-docker"
      docker.ports = [
	'127.0.0.1:8000:8000',
	'127.0.0.1:9229:9229',
      ]
      docker.remains_running = true
      docker.has_ssh = true
      docker.create_args = ['--tmpfs', '/tmp:exec', '--tmpfs', '/run',
			    '-v', '/sys/fs/cgroup:/sys/fs/cgroup:ro',
#          '--volume=ag-solo-state:/vagrant/cosmic-swingset/solo',
#          '--volume=ag-setup-cosmos-chains:/vagrant/cosmic-swingset/chains',
#          '--volume=ag-cosmos-helper-state:/root/.ag-cosmos-helper',
			    '--privileged=true',
#			    '-v', '/var/run/docker.sock:/var/run/docker.sock',
	]
    end
end
