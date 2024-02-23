package e2etest

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"testing"

	"github.com/agoric-labs/interchaintest/v6"
	"github.com/agoric-labs/interchaintest/v6/chain/cosmos"
	"github.com/agoric-labs/interchaintest/v6/ibc"
	"github.com/agoric-labs/interchaintest/v6/relayer"
	"github.com/agoric-labs/interchaintest/v6/testutil"

	"go.uber.org/zap/zaptest"
)

const CHAIN_AGORIC = "agoric"
const CHAIN_GAIA = "gaia"

const RELAYER_COSMOS = "cosmos"
const RELAYER_HERMES = "hermes"

const DEFAULT_CHAINIMAGE_AGORIC = "agoric:heighliner-agoric"
const DEFAULT_BLOCKS_TO_WAIT = 25

const FMT_ENV_CHAINNAME = "E2ETEST_CHAINNAME%d"
const ENV_CHAINIMAGE_AGORIC = "E2ETEST_CHAINIMAGE_AGORIC"
const ENV_RELAYERNAME = "E2ETEST_RELAYERNAME"
const ENV_BLOCKS_TO_WAIT = "E2ETEST_BLOCKS_TO_WAIT"

// newHermesFactory creates a hermes relayer
func newHermesFactory(t *testing.T) interchaintest.RelayerFactory {
	return interchaintest.NewBuiltinRelayerFactory(
		ibc.Hermes,
		zaptest.NewLogger(t),
	)
}

// newCosmosRlyFactory creates a cosmos relayer
func newCosmosRlyFactory(t *testing.T) interchaintest.RelayerFactory {

	// TODO: At one point was using latest docker image for relyaer but disabling
	// to remove variables while debugging heighliner builds of agoric chain are failing
	//
	IBCRelayerImage := "ghcr.io/cosmos/relayer"
	IBCRelayerVersion := "latest"
	image := relayer.CustomDockerImage(IBCRelayerImage, IBCRelayerVersion, "100:1000")

	return interchaintest.NewBuiltinRelayerFactory(
		ibc.CosmosRly,
		zaptest.NewLogger(t),
		image,
	)
}

// newCosmosHubChainSpec creates a chainspec for a gaia instance compatible with these tests
// TODO: replacing the v13.0.01 version with latest has not been tested.
func newCosmosHubChainSpec(chainUniqueName string, chainID string, numOfValidators int, numOfFullNodes int) *interchaintest.ChainSpec {
	ret := &interchaintest.ChainSpec{
		Name:          "gaia",
		ChainName:     chainUniqueName,
		Version:       "v13.0.1", // This version of gaiad has the interface interchaintestv6 needs
		NumValidators: &numOfValidators,
		NumFullNodes:  &numOfFullNodes,
	}

	ret.ChainConfig.ChainID = chainID
	return ret
}

// newUnknownCosmosChainSpec creates any cosmos chain where interchaintest has a built in definition
// NB: In many cases these images will not work due to issues outside the scope of Agoric's project
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

// newAgoricChainSpec fully specifies the details necessary to launch an Agoric chain image built from
// - https://github.com/strangelove-ventures/heighliner/pull/211
// - NoCrisisModule is a flag added in the agoric-labs fork of interchaintest
func newAgoricChainSpec(chainUniqueName string, chainID string, chainImage ibc.DockerImage, numOfValidators int, numOfFullNodes int) *interchaintest.ChainSpec {
	coinDecimals := int64(6)
	gasAdjustment := 1.3
	noHostMount := false

	return &interchaintest.ChainSpec{
		Name:          "agoric",
		ChainName:     chainUniqueName,
		Version:       chainImage.Version,
		GasAdjustment: &gasAdjustment,
		NoHostMount:   &noHostMount,
		ChainConfig: ibc.ChainConfig{
			Type:    "cosmos",
			Name:    "agoric",
			ChainID: chainID,
			Images: []ibc.DockerImage{
				chainImage,
			},
			Bin:          "agd",
			Bech32Prefix: "agoric",
			Denom:        "ubld",
			CoinType:     "564",
			// interchaintest is super flaky when gas is enabled
			GasPrices:      "0.0ubld",
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

// getChainImage will build a docker image from the environment variable value
// E2ETEST_CHAINIMAGE_AGORIC. The value of this env var
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

// getChainNames reads the environment variables FMT_ENV_CHAINNAME0, FMT_ENV_CHAINNAME1, FMT_ENV_CHAINNAME2, FMT_ENV_CHAINNAME3
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

// getChainSpec reads environment variables and builds a full ChainSpec
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

// getRelayerFactory reads environment variables and builds the correct RelayerFactory
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

// sendIBCTransferWithWait performs cosmos.CosmosChain.SendIBCTransfer
// - Automatically waits to confirm TX is ACK'd
// - Automatically waits for results to settle
// - The environment variable E2ETEST_BLOCKS_TO_WAIT controls how many blocks to wait for ACK and settlement
func sendIBCTransferWithWait(
	c *cosmos.CosmosChain,
	ctx context.Context,
	channelID string,
	keyName string,
	amount ibc.WalletAmount,
	options ibc.TransferOptions,
) (tx ibc.Tx, err error) {
	blocksToWait := DEFAULT_BLOCKS_TO_WAIT

	blocksAsStr, present := os.LookupEnv(ENV_BLOCKS_TO_WAIT)
	if present {
		blocksToWait, err = strconv.Atoi(blocksAsStr)
		if err != nil {
			return tx, err
		}
	}

	chainAHeight, err := c.Height(ctx)
	if err != nil {
		return tx, err
	}

	tx, err = c.SendIBCTransfer(ctx, channelID, keyName, amount, options)
	if err != nil {
		return tx, err
	}

	_, err = testutil.PollForAck(ctx, c, chainAHeight, chainAHeight+30, tx.Packet)
	if err != nil {
		return tx, err
	}

	err = testutil.WaitForBlocks(ctx, blocksToWait, c)
	if err != nil {
		return tx, err
	}

	return tx, err
}
