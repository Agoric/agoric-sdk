NUM_INSTANCES=5

# DigitalOcean

export DO_API_TOKEN="myDigitalOceanApiKey"

## Provision the cluster
cd terraform/digitalocean
terraform init
terraform apply -var DO_API_TOKEN="$DO_API_TOKEN" -var SSH_KEY_FILE="$HOME/.ssh/id_rsa.pub" -var SERVERS=$NUM_INSTANCES

terraform output -json public_ips

cd ../../ansible

pip install dopy
ansible-playbook -i inventory/digital_ocean.py -l agoric install.yml
ansible-playbook -i inventory/digital_ocean.py -l agoric config.yml # BINARY, CONFIGDIR

sleep 10

# get each node's ID to populate the new startup file
curl $ip:26657/status
# --p2p.persistent_peers=ID@host:port,ID@host:port,...

ansible-playbook -i inventory/digital_ocean.py -l agoric install.yml
ansible-playbook -i inventory/digital_ocean.py -l sentrynet restart.yml

## Delete the cluster.

cd terraform/digitalocean
terraform destroy (vars)