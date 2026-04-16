#! /bin/bash
# get-namespace.sh - Print the multichain namespace for the supplied context argument.
# Usage: get-namespace.sh [KUBECONTEXT]
# If KUBECONTEXT is not supplied, the current context is used.
set -euo pipefail

KUBECONTEXT=${1:-$(kubectl config current-context)}

context_attr() {
  attr=$1
  # Sample:
  # KUBECONTEXT=mycontext attr=namespace
  # '-o' argument: jsonpath='{.contexts[?(@.name=="mycontext")].context.namespace}'
  kubectl config view -o jsonpath='{.contexts[?(@.name=="'"$KUBECONTEXT"'")].context.'"$attr"'}' 2> /dev/null
}

# First, see if the context has an explicit namespace.
NAMESPACE=$(context_attr namespace)
if [ -n "$NAMESPACE" ]; then
  echo "$NAMESPACE"
  exit 0
fi

# Next, see if we can derive a namespace from the cluster or KUBECONTEXT name.
if [ "$KUBECONTEXT" = starship ]; then
  CLUSTER=starship
else
  CLUSTER=$(context_attr cluster)
fi

case $CLUSTER in
  hetzner | starship)
    # Transform the user name to a Hetzner namespace, as per SRE guidelines.
    NAMESPACE=$(context_attr user | tr '[:upper:]' '[:lower:]' | sed -E 's/@/-/g; s/[.]+/-/g; s/[^a-z0-9-]+/-/g; s/^-+|-+$$//g')
    ;;
esac

if [ -z "$NAMESPACE" ]; then
  # Default namespace is default.
  NAMESPACE=default
fi
echo "$NAMESPACE"
