package agoricinterchaintest

import (
	"context"
	"testing"

	interchaintest "github.com/strangelove-ventures/interchaintest/v6"
	"github.com/strangelove-ventures/interchaintest/v6/conformance"
	"github.com/strangelove-ventures/interchaintest/v6/ibc"
	"github.com/strangelove-ventures/interchaintest/v6/testreporter"
	"go.uber.org/zap/zaptest"
)

func TestConformance(t *testing.T) {
	numOfValidators := 2 // Defines how many validators should be used in each network.
	numOfFullNodes := 0  // Defines how many additional full nodes should be used in each network.

	// Here we define our ChainFactory by instantiating a new instance of the BuiltinChainFactory exposed in interchaintest.
	// We use the ChainSpec type to fully describe which chains we want to use in our tests.
	cf := interchaintest.NewBuiltinChainFactory(zaptest.NewLogger(t), []*interchaintest.ChainSpec{
		{
			Name:          "gaia",
			ChainName:     "cosmoshub-1",
			Version:       "v13.0.1",
			NumValidators: &numOfValidators,
			NumFullNodes:  &numOfFullNodes,
		},
		{
			Name:          "gaia",
			ChainName:     "cosmoshub-2",
			Version:       "v13.0.1",
			NumValidators: &numOfValidators,
			NumFullNodes:  &numOfFullNodes,
		},
	})

	// Here we define our RelayerFactory by instantiating a new instance of the BuiltinRelayerFactory exposed in interchaintest.
	// We will instantiate two instances, one for the Go relayer and one for Hermes.
	rlyFactory := interchaintest.NewBuiltinRelayerFactory(
		ibc.CosmosRly,
		zaptest.NewLogger(t),
	)

	hermesFactory := interchaintest.NewBuiltinRelayerFactory(
		ibc.Hermes,
		zaptest.NewLogger(t),
	)

	// conformance.Test requires a Go context
	ctx := context.Background()

	// For our example we will use a No-op reporter that does not actually collect any test reports.
	rep := testreporter.NewNopReporter()

	// Test will now run the conformance test suite against both of our chains, ensuring that they both have basic
	// IBC capabilities properly implemented and work with both the Go relayer and Hermes.
	conformance.Test(t, ctx, []interchaintest.ChainFactory{cf}, []interchaintest.RelayerFactory{rlyFactory, hermesFactory}, rep)
}
