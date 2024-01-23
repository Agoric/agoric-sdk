A demonstration of how to declare a CoreEvalProposal

The console output will show errors, because the `restart-vats` proposal is not well maintained.

Requires manually and checking in the submiission, until https://github.com/Agoric/agoric-3-proposals/issues/87
```sh
agoric run packages/builders/scripts/vats/restart-vats.js
mkdir a3p-integration/proposals/b:restart-vats/submission
mv restart-vats* a3p-integration/proposals/b:restart-vats/submission
cp $(grep -oh '/.*b1-.*.json' restart-vats*) a3p-integration/proposals/b:restart-vats/submission
git add a3p-integration/proposals/b:restart-vats/submission
```

Then look in the 
