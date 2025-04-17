### Necessary steps to setup stride for liquid staking

1. Allow messages to be executed from stride ICA account

```sh
# copy allow msgs proposal in the kubectl env
kubectl cp ./agoric-sdk/multichain-testing/scripts/add_ica_allowed_msgs_proposal.json stridelocal-genesis-0:/tmp/add_ica_allowed_msgs_proposal.json

# submit-proposal
kubectl exec -i stridelocal-genesis-0 -- strided tx gov submit-legacy-proposal param-change /tmp/add_ica_allowed_msgs_proposal.json --from genesis --gas 9000000 -y

# voting
kubectl exec -i stridelocal-genesis-0 -- strided tx gov vote 1 yes  --from genesis --gas 90000 -y
```

2. Add hostzone

```sh
# copy hostzone proposal in the kubectl env
kubectl cp ./agoric-sdk/multichain-testing/scripts/add_hostzones_proposal.json stridelocal-genesis-0:/tmp/add_hostzones_proposal.json

# submit proposal to add host zone
kubectl exec -i stridelocal-genesis-0 -- strided tx gov submit-proposal /tmp/add_hostzones_proposal.json --from genesis --gas 9000000 -y

# voting
kubectl exec -i stridelocal-genesis-0 -- strided tx gov vote 1 yes  --from genesis --gas 90000 -y
```