# Starship Devnet Action (Agoric fork)

This `starship-action` was extracted from https://github.com/hyperweb-io/starship-action/tree/0.3.0

We took:
- action.yaml
- install.sh
- port-forward.sh

Agoric added the `load-docker-images` input parameter to be able to import locally-built Docker images into Starship's Kubernetes cluster.

Also, we ran `yarn prettier --write .github/actions/starship-action` to reformat
the code to our repository's standards.
