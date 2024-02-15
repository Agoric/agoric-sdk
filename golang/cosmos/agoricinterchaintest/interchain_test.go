package agoricinterchaintest

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	interchaintest "github.com/agoric-labs/interchaintest/v6"
	"github.com/agoric-labs/interchaintest/v6/conformance"
	"github.com/agoric-labs/interchaintest/v6/ibc"
	"github.com/agoric-labs/interchaintest/v6/relayer"
	"github.com/agoric-labs/interchaintest/v6/testreporter"
	"go.uber.org/zap/zaptest"
)

const CHAIN_AGORIC = "agoric"
const CHAIN_GAIA = "gaia"

const RELAYER_COSMOS = "cosmos"
const RELAYER_HERMES = "hermes"

const DEFAULT_CHAINIMAGE_AGORIC = "ivanagoric/agoric:heighliner-agoric"

const FMT_ENV_CHAINNAME = "PFME2E_CHAINNAME%d"
const ENV_CHAINIMAGE_AGORIC = "PFME2E_CHAINIMAGE_AGORIC"
const ENV_RELAYERNAME = "PFME2E_RELAYERNAME"

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

func newCosmosHubChainSpec(chainUniqueName string, chainID string, numOfValidators int, numOfFullNodes int) *interchaintest.ChainSpec {
	ret := &interchaintest.ChainSpec{
		Name:          "gaia",
		ChainName:     chainUniqueName,
		Version:       "v13.0.1",
		NumValidators: &numOfValidators,
		NumFullNodes:  &numOfFullNodes,
	}

	ret.ChainConfig.ChainID = chainID
	return ret
}

func newUnknownCosmosChainSpec(chain string, chainUniqueName string, chainID string, numOfValidators int, numOfFullNodes int) *interchaintest.ChainSpec {
	ret := &interchaintest.ChainSpec{
		Name:          chain,
		ChainName:     chainUniqueName,
		Version:       "latest",
		NumValidators: &numOfValidators,
		NumFullNodes:  &numOfFullNodes,
	}

	ret.ChainConfig.ChainID = chainID
	return ret
}

func newAgoricChainSpec(chainUniqueName string, chainID string, chainImage ibc.DockerImage, numOfValidators int, numOfFullNodes int) *interchaintest.ChainSpec {
	coinDecimals := int64(6)
	gasAdjustment := 1.3
	noHostMount := false

	return &interchaintest.ChainSpec{
		Name:          "agoric",
		ChainName:     chainUniqueName,
		Version:       "heighliner-agoric",
		GasAdjustment: &gasAdjustment,
		NoHostMount:   &noHostMount,
		ChainConfig: ibc.ChainConfig{
			Type:    "cosmos",
			Name:    "agoric",
			ChainID: chainID,
			Images: []ibc.DockerImage{
				chainImage,
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

// getChainImage will return the environment variable value
// PFME2E_CHAINIMAGE_AGORIC. The value of this env var
// must be in the form "repo/image:version"
func getChainImageAgoric(t *testing.T) ibc.DockerImage {
	ret := ibc.DockerImage{
		UidGid: "1025:1025",
	}

	chainImage, present := os.LookupEnv(ENV_CHAINIMAGE_AGORIC)
	if !present {
		chainImage = DEFAULT_CHAINIMAGE_AGORIC
	}

	parts := strings.Split(chainImage, ":")
	if len(parts) == 2 {
		ret.Repository = parts[0]
		ret.Version = parts[1]
	} else {
		t.Fatalf("Invalid value for %s[%s]. Must be of the format 'repository:version'", ENV_CHAINIMAGE_AGORIC, chainImage)
	}

	t.Logf("ChainImages: %s[%s:%s]", ENV_CHAINIMAGE_AGORIC, ret.Repository, ret.Version)

	return ret
}

func getChainNames(t *testing.T) [4]string {

	ret := [4]string{
		CHAIN_AGORIC, CHAIN_AGORIC, CHAIN_AGORIC, CHAIN_AGORIC,
	}

	for i := 0; i < 4; i++ {
		envVar := fmt.Sprintf(FMT_ENV_CHAINNAME, i)
		chainName, present := os.LookupEnv(envVar)
		if present {
			ret[i] = chainName
		}
	}

	t.Logf("ChainNames: %s[%s] %s[%s] %s[%s] %s[%s]",
		fmt.Sprintf(FMT_ENV_CHAINNAME, 0), ret[0],
		fmt.Sprintf(FMT_ENV_CHAINNAME, 1), ret[1],
		fmt.Sprintf(FMT_ENV_CHAINNAME, 2), ret[2],
		fmt.Sprintf(FMT_ENV_CHAINNAME, 3), ret[3])

	return ret
}

func getChainSpec(t *testing.T) []*interchaintest.ChainSpec {
	nv := 1
	nf := 0

	chainNames := getChainNames(t)
	chainImage := getChainImageAgoric(t)

	ret := make([]*interchaintest.ChainSpec, 4)

	for index, chainName := range chainNames {
		chainId := fmt.Sprintf("%s%d", chainName, index)
		chainUniqueName := chainId

		switch chainName {
		case CHAIN_AGORIC:
			ret[index] = newAgoricChainSpec(chainUniqueName, chainId, chainImage, nv, nf)
		case CHAIN_GAIA:
			ret[index] = newCosmosHubChainSpec(chainUniqueName, chainId, nv, nf)
		default:
			ret[index] = newUnknownCosmosChainSpec(chainName, chainUniqueName, chainId, nv, nf)
		}
	}

	return ret
}

func getRelayerFactory(t *testing.T) interchaintest.RelayerFactory {
	relayerName, present := os.LookupEnv(ENV_RELAYERNAME)
	if !present {
		relayerName = RELAYER_COSMOS
	}

	var ret interchaintest.RelayerFactory

	switch relayerName {
	case RELAYER_COSMOS:
		ret = newCosmosRlyFactory(t)
	case RELAYER_HERMES:
		ret = newHermesFactory(t)
	default:
		t.Fatalf("Invalid value for %s[%s]. Valid values are [%s] or [%s]", ENV_RELAYERNAME, relayerName, RELAYER_COSMOS, RELAYER_HERMES)
	}

	t.Logf("RelayerNmae: %s[%s]", ENV_RELAYERNAME, relayerName)

	return ret
}

func TestConformance(t *testing.T) {
	cs := getChainSpec(t)
	rf := getRelayerFactory(t)
	testConformance(t, cs[0:2], rf)
}

func testConformance(t *testing.T, cs []*interchaintest.ChainSpec, rf interchaintest.RelayerFactory) {
	cf := interchaintest.NewBuiltinChainFactory(zaptest.NewLogger(t), cs)

	ctx, cancel := context.WithDeadline(context.Background(), time.Now().Add(45*time.Minute))
	defer cancel()

	// For our example we will use a No-op reporter that does not actually collect any test reports.
	rep := testreporter.NewNopReporter()

	// Test will now run the conformance test suite against both of our chains, ensuring that they both have basic
	// IBC capabilities properly implemented and work with both the Go relayer and Hermes.
	conformance.Test(t, ctx, []interchaintest.ChainFactory{cf}, []interchaintest.RelayerFactory{rf}, rep)
}

func TestChainPair(t *testing.T) {
	cs := getChainSpec(t)
	rf := getRelayerFactory(t)
	testChainPair(t, cs[0:2], rf)
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
