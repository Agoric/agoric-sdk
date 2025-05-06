# VM Config

Factored out of [@agoric/vats](../vats), by way of [@agoric/boot](../boot).

This is similar to `@agoric/boot` but because that has the integration testing of bootstrap, it depends on almost everything.

The configs themselves have no dependencies. Keeping them separate allows packages to depend on them without depending on the world.

# Future ideas

- [ ] move some things from agoric/vats to agoric/boot (needed only to bootstrap)
- [ ] move authorityViz to vm-config
- [ ] consider moving defaultBootstrapVatConfig out of cosmic-swingset (by making sim-chain configurable)
