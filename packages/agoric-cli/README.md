# Agoric CLI

If you just want to use the Agoric CLI for your own smart contract, please see the [Getting Started website](https://agoric.com/documentation/getting-started/) for information.

## Developing Agoric CLI

**NOTE: these steps are only for modifying the Agoric CLI.  See the above for using it to create your own smart contracts.**

If you want to modify the `template` directory used by Agoric CLI, you can run:

```sh
# Change to the template directory
cd template
# Start the http://localhost:8000 Agoric VM
../bin/agoric --sdk start --reset
# Deploy the test contracts
../bin/agoric --sdk deploy contract/deploy.js api/deploy.js
```

Then, iterate on editing and rerunning the `start` and `deploy` steps above to test the new template.

Please create a PR on this repository if you have an improvement for the template.
