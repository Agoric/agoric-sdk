import {exec} from 'child_process';

const main = async (args) => {
  const cmd = args[0];
  switch (cmd) {
    case 'create':
      console.log('')
      break;
    case 'provision':
      console.log('would init', args[1], 'from', __dirname);
      break;
    case 'config':
      break;
    case 'start':
      console.log('would install');
      break;
    case 'stop':
    case 'destroy':
      console.log('would destroy');
      break;
    default:
      throw `Unknown command ${cmd}`;
  }
};

export default main;

/*
OR=override.tf
if test -f "$OR"; then
  echo 1>&2 "$thisdir/$OR already exists; use --force to reconfigure"
  exit 1
fi

if test -z "$PLACEMENT"; then
  echo "\$PLACEMENT is a space-separated list of PROVIDER[:ZONE]:NUMBER entries"
  echo "e.g. PLACEMENT=digitalocean:3 aws:canada-central:3"
  read -r -p 'PLACEMENT=' -e PLACEMENT
fi

if test -z "$PLACEMENT"; then
  echo 1>&2 "PLACEMENT must be specified"
  exit 1
fi

test -n "$SSH_KEY_FILE" || read -r -p 'SSH_KEY_FILE=' -e SSH_KEY_FILE
if test -n "$SSH_KEY_FILE"; then
  cat >> "$OR" <<EOF
variable "SSH_KEY_FILE" {
  default = "$SSH_KEY_FILE"
}
EOF
fi

for place in $PLACEMENT; do
  # Break apart into provider, zone, number
  place=`echo "$place" | sed -e 's/:/ /g'`
  set dummy $place
  shift
  provider=$1
  shift
  case $1 in
  [^1-9]*) zone=$1; shift; ;;
  *) zone= ;;
  esac
  count=$1

  case " $PROVIDERS " in
  " $provider ") ;;
  *) PROVIDERS="$PROVIDERS $provider"
  esac

  ZONES=
  eval "ZONES=\$${provider}_ZONES"
  case " $ZONES " in
  " $zone ") ;;
  *) ZONES="$ZONES $zone="
  esac
  eval "${provider}_ZONES=\$ZONES"
done

for provider in $PROVIDERS
  case "$provider" in
  digitalocean)
    test -n "$DO_API_TOKEN" || read -r -p 'DO_API_TOKEN=' -e DO_API_TOKEN
    cat >> "$OR" <<EOF
variable "DO_API_TOKEN" {
  default = "$DO_API_TOKEN"
}

module "digitalocean" {
  source           = "./digitalocean"
  TESTNET_NAME     = "\${var.TESTNET_NAME}"
  SSH_KEY_FILE     = "\${var.SSH_KEY_FILE}"
  DO_API_TOKEN     = "\${var.DO_API_TOKEN}"
  SERVERS          = "\${var.SERVERS == 0 ? var.SERVERS_MAP["digitalocean"] : var.SERVERS"
}
EOF

echo > "$OR" <<EOF

output "public_ips" {
  value = "${concat(module.digitalocean.public_ips)}"
}
EOF
*/
