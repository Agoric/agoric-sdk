package agoricinterchaintest

import (
	"context"
	"fmt"
	"testing"

	interchaintest "github.com/agoric-labs/interchaintest/v6"
	"github.com/agoric-labs/interchaintest/v6/conformance"
	"github.com/agoric-labs/interchaintest/v6/ibc"
	"github.com/agoric-labs/interchaintest/v6/relayer"
	"github.com/agoric-labs/interchaintest/v6/testreporter"
	"go.uber.org/zap/zaptest"
)

func newHermesFactory(t *testing.T) interchaintest.RelayerFactory {
	return interchaintest.NewBuiltinRelayerFactory(
		ibc.Hermes,
		zaptest.NewLogger(t),
	)
}

func newCosmosRlyFactory(t *testing.T) interchaintest.RelayerFactory {
	IBCRelayerImage := "ghcr.io/cosmos/relayer"
	IBCRelayerVersion := "latest"

	return interchaintest.NewBuiltinRelayerFactory(
		ibc.CosmosRly,
		zaptest.NewLogger(t),
		relayer.CustomDockerImage(IBCRelayerImage, IBCRelayerVersion, "100:1000"))
}

func newCosmosHubChainSpec(chainName string, numOfValidators int, numOfFullNodes int) *interchaintest.ChainSpec {
	return &interchaintest.ChainSpec{
		Name:          "gaia",
		ChainName:     chainName,
		Version:       "v13.0.1",
		NumValidators: &numOfValidators,
		NumFullNodes:  &numOfFullNodes,
	}
}

func newAgoricChainSpec(chainName string, chainID string, numOfValidators int, numOfFullNodes int) *interchaintest.ChainSpec {
	coinDecimals := int64(6)
	gasAdjustment := 1.3
	noHostMount := false

	if len(chainID) < 1 {
		chainID = chainName
	}

	return &interchaintest.ChainSpec{
		Name:          "agoric",
		ChainName:     chainName,
		Version:       "heighliner-agoric",
		GasAdjustment: &gasAdjustment,
		NoHostMount:   &noHostMount,
		ChainConfig: ibc.ChainConfig{
			Type:    "cosmos",
			Name:    "agoric",
			ChainID: chainID,
			Images: []ibc.DockerImage{
				{
					// TODO: The image to use should be passed into this test to make it more dynamic
					Repository: "ivanagoric/agoric",
					Version:    "heighliner-agoric",
					UidGid:     "1025:1025",
				},
			},
			Bin:            "agd",
			Bech32Prefix:   "agoric",
			Denom:          "ubld",
			CoinType:       "564",
			GasPrices:      "0.01ubld",
			GasAdjustment:  1.3,
			TrustingPeriod: "672h",
			NoHostMount:    false,
			NoCrisisModule: true,
			SkipGenTx:      false,
			CoinDecimals:   &coinDecimals,
		},
		NumValidators: &numOfValidators,
		NumFullNodes:  &numOfFullNodes,
	}
}
func TestChainPair_Agoric_Cosmos_1Val_CosmosRly(t *testing.T) {
	numOfValidators := 1
	numOfFullNodes := 0

	cs := []*interchaintest.ChainSpec{
		newAgoricChainSpec("agoric-1", "agoricchain-1", numOfValidators, numOfFullNodes),
		newCosmosHubChainSpec("cosmoshub-1", numOfValidators, numOfFullNodes),
	}

	testChainPair(t, cs, newCosmosRlyFactory(t))
}

func TestChainPair_Agoric_Cosmos_1Val_Hermes(t *testing.T) {
	numOfValidators := 1
	numOfFullNodes := 0

	cs := []*interchaintest.ChainSpec{
		newAgoricChainSpec("agoric-1", "agoricchain-1", numOfValidators, numOfFullNodes),
		newCosmosHubChainSpec("cosmoshub-1", numOfValidators, numOfFullNodes),
	}

	testChainPair(t, cs, newHermesFactory(t))
}

func TestChainPair_Cosmos_Cosmos_1Val_CosmosRly(t *testing.T) {
	numOfValidators := 1
	numOfFullNodes := 0

	cs := []*interchaintest.ChainSpec{
		newCosmosHubChainSpec("cosmoshub-1", numOfValidators, numOfFullNodes),
		newCosmosHubChainSpec("cosmoshub-2", numOfValidators, numOfFullNodes),
	}

	testChainPair(t, cs, newCosmosRlyFactory(t))
}

func TestChainPair_Cosmos_Cosmos_1Val_Hermes(t *testing.T) {
	numOfValidators := 1
	numOfFullNodes := 0

	cs := []*interchaintest.ChainSpec{
		newCosmosHubChainSpec("cosmoshub-1", numOfValidators, numOfFullNodes),
		newCosmosHubChainSpec("cosmoshub-2", numOfValidators, numOfFullNodes),
	}

	testChainPair(t, cs, newHermesFactory(t))
}

func TestChainPair_Cosmos_Agoric_1Val_Hermes(t *testing.T) {
	numOfValidators := 1
	numOfFullNodes := 0

	cs := []*interchaintest.ChainSpec{
		newCosmosHubChainSpec("cosmoshub-1", numOfValidators, numOfFullNodes),
		newAgoricChainSpec("agoric-1", "agoricchain-1", numOfValidators, numOfFullNodes),
	}

	testChainPair(t, cs, newHermesFactory(t))
}

func TestChainPair_Agoric_Agoric_1Val_CosmosRly(t *testing.T) {
	numOfValidators := 1
	numOfFullNodes := 0

	cs := []*interchaintest.ChainSpec{
		newAgoricChainSpec("agoric-1", "agoricchain-1", numOfValidators, numOfFullNodes),
		newAgoricChainSpec("agoric-2", "agoricchain-2", numOfValidators, numOfFullNodes),
	}

	testChainPair(t, cs, newCosmosRlyFactory(t))
}

func TestChainPair_Agoric_Agoric_1Val_Hermes(t *testing.T) {
	numOfValidators := 1
	numOfFullNodes := 0

	cs := []*interchaintest.ChainSpec{
		newAgoricChainSpec("agoric-1", "agoricchain-1", numOfValidators, numOfFullNodes),
		newAgoricChainSpec("agoric-2", "agoricchain-2", numOfValidators, numOfFullNodes),
	}

	testChainPair(t, cs, newHermesFactory(t))
}

func TestChainPair_Agoric_Cosmos_2Val(t *testing.T) {
	numOfValidators := 2
	numOfFullNodes := 0

	cs := []*interchaintest.ChainSpec{
		newAgoricChainSpec("agoric-1", "agoricchain-1", numOfValidators, numOfFullNodes),
		newCosmosHubChainSpec("cosmoshub-1", numOfValidators, numOfFullNodes),
	}

	testChainPair(t, cs, newCosmosRlyFactory(t))
}

func testChainPair(t *testing.T, cs []*interchaintest.ChainSpec, rf interchaintest.RelayerFactory) {

	cf := interchaintest.NewBuiltinChainFactory(zaptest.NewLogger(t), cs)

	// Use a 45 min
	// ctx, cancel := context.WithDeadline(context.Background(), time.Now().Add(45*time.Minute))
	// defer cancel()
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

func TestConformance_Agoric_Cosmos_1Val(t *testing.T) {
	numOfValidators := 1
	numOfFullNodes := 0

	cs := []*interchaintest.ChainSpec{
		newAgoricChainSpec("agoric-1", "agoricchain-1", numOfValidators, numOfFullNodes),
		newCosmosHubChainSpec("cosmoshub-1", numOfValidators, numOfFullNodes),
	}

	testConformance(t, cs)
}

func TestConformance_Agoric_Cosmos_2Val(t *testing.T) {
	numOfValidators := 2
	numOfFullNodes := 0

	cs := []*interchaintest.ChainSpec{
		newAgoricChainSpec("agoric-1", "agoricchain-1", numOfValidators, numOfFullNodes),
		newCosmosHubChainSpec("cosmoshub-1", numOfValidators, numOfFullNodes),
	}

	testConformance(t, cs)
}

func testConformance(t *testing.T, cs []*interchaintest.ChainSpec) {
	numOfValidators := 1
	numOfFullNodes := 0

	cf := interchaintest.NewBuiltinChainFactory(zaptest.NewLogger(t), []*interchaintest.ChainSpec{
		newAgoricChainSpec("agoric-1", "agoricchain-1", numOfValidators, numOfFullNodes),
		newCosmosHubChainSpec("cosmoshub-1", numOfValidators, numOfFullNodes),
	})
	//rf := newAgoricRelayersFactory(t)
	rf := newCosmosRlyFactory(t)

	// TODO: Use a 45 min
	// ctx, cancel := context.WithDeadline(context.Background(), time.Now().Add(45*time.Minute))
	// defer cancel()
	ctx := context.Background()

	// For our example we will use a No-op reporter that does not actually collect any test reports.
	rep := testreporter.NewNopReporter()

	// Test will now run the conformance test suite against both of our chains, ensuring that they both have basic
	// IBC capabilities properly implemented and work with both the Go relayer and Hermes.
	conformance.Test(t, ctx, []interchaintest.ChainFactory{cf}, []interchaintest.RelayerFactory{rf}, rep)
}
