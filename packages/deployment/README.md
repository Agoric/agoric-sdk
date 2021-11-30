# Agoric testnet Deployment

**NOTE: This private package does not create secure public testnets by default.  We recommend that public validators use their own well-understood, diversified means of deployment.**

You can use this package to configure privately-accessible testnets, such as on your local workstation's Docker, or a local-to-your organization LAN.

If you want to create a publically-accessible testnet you will at least need to:

1. Configure your nodes' firewalls so that only the necessary ports are accessible.
2. Set up your provisioning server (node0) to expose the provisioner only on HTTPS with some form of authentication.
3. **Do more, which we are not sure of**

## Triggering deployment tests

Use the following to start a deployment test on [GitHub Actions](https://github.com/Agoric/agoric-sdk/actions/workflows/deployment-test.yml):

```sh
./scripts/start-deployment-test.sh master
```
