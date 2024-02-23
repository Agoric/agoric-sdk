package e2etest

import (
	"context"
	"fmt"
	"testing"

	"github.com/agoric-labs/interchaintest/v6"
	"github.com/agoric-labs/interchaintest/v6/conformance"
	"github.com/agoric-labs/interchaintest/v6/testreporter"
	"go.uber.org/zap/zaptest"
)

// TestConformance builds chainspec & relayers from env vars then runs conformance tests
func TestConformance(t *testing.T) {
	cs := getChainSpec(t)
	rf := getRelayerFactory(t)
	testConformance(t, cs[0:2], rf)
}

// TestChainPair builds chainspec & relayers from env vars then runs chain pair tests
func TestChainPair(t *testing.T) {
	cs := getChainSpec(t)
	rf := getRelayerFactory(t)
	testChainPair(t, cs[0:2], rf)
}

func testConformance(t *testing.T, cs []*interchaintest.ChainSpec, rf interchaintest.RelayerFactory) {
	cf := interchaintest.NewBuiltinChainFactory(zaptest.NewLogger(t), cs)

	ctx := context.Background()

	// For our example we will use a No-op reporter that does not actually collect any test reports.
	rep := testreporter.NewNopReporter()

	// Test will now run the conformance test suite against both of our chains, ensuring that they both have basic
	// IBC capabilities properly implemented and work with both the Go relayer and Hermes.
	conformance.Test(t, ctx, []interchaintest.ChainFactory{cf}, []interchaintest.RelayerFactory{rf}, rep)
}

func testChainPair(t *testing.T, cs []*interchaintest.ChainSpec, rf interchaintest.RelayerFactory) {
	cf := interchaintest.NewBuiltinChainFactory(zaptest.NewLogger(t), cs)

	ctx := context.Background()

	// For our example we will use a No-op reporter that does not actually collect any test reports.
	rep := testreporter.NewNopReporter()

	chains, err := cf.Chains(t.Name())
	if err != nil {
		panic(fmt.Errorf("failed to get chains: %v", err))
	}

	client, network := interchaintest.DockerSetup(t)
	conformance.TestChainPair(t, ctx, client, network, chains[0], chains[1], rf, rep, nil)
}
