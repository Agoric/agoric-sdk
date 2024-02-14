package agoricinterchaintest

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	interchaintest "github.com/agoric-labs/interchaintest/v6"
	"github.com/agoric-labs/interchaintest/v6/chain/cosmos"
	"github.com/agoric-labs/interchaintest/v6/ibc"
	"github.com/agoric-labs/interchaintest/v6/relayer"
	"github.com/agoric-labs/interchaintest/v6/testreporter"
	"github.com/agoric-labs/interchaintest/v6/testutil"
	sdk "github.com/cosmos/cosmos-sdk/types"
	transfertypes "github.com/cosmos/ibc-go/v6/modules/apps/transfer/types"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zaptest"
)

type PacketMetadata struct {
	Forward *ForwardMetadata `json:"forward"`
}

type ForwardMetadata struct {
	Receiver       string        `json:"receiver"`
	Port           string        `json:"port"`
	Channel        string        `json:"channel"`
	Timeout        time.Duration `json:"timeout"`
	Retries        *uint8        `json:"retries,omitempty"`
	Next           *string       `json:"next,omitempty"`
	RefundSequence *uint64       `json:"refund_sequence,omitempty"`
}

var (
	chainName_A, chainName_B, chainName_C, chainName_D = "chaina", "chainb", "chainc", "chaind"
	nv                                                 = 1
	nf                                                 = 0
)

func TestPacketForwardMiddleware_AllGaia(t *testing.T) {

	cs := []*interchaintest.ChainSpec{
		newCosmosHubChainSpec(chainName_A, nv, nf),
		newCosmosHubChainSpec(chainName_B, nv, nf),
		newCosmosHubChainSpec(chainName_C, nv, nf),
		newCosmosHubChainSpec(chainName_D, nv, nf),
	}
	testPacketForwardMiddleware(t, cs)
}

func TestPacketForwardMiddleware_Agoric_Gaia(t *testing.T) {

	cs := []*interchaintest.ChainSpec{
		newAgoricChainSpec("agoric", chainName_A, nv, nf),
		newCosmosHubChainSpec(chainName_B, nv, nf),
		newCosmosHubChainSpec(chainName_C, nv, nf),
		newCosmosHubChainSpec(chainName_D, nv, nf),
	}
	testPacketForwardMiddleware(t, cs)
}

func testPacketForwardMiddleware(t *testing.T, cs []*interchaintest.ChainSpec) {

	var (
		ctx                            = context.Background()
		client, network                = interchaintest.DockerSetup(t)
		rep                            = testreporter.NewNopReporter()
		eRep                           = rep.RelayerExecReporter(t)
		chainA, chainB, chainC, chainD *cosmos.CosmosChain
	)

	cf := interchaintest.NewBuiltinChainFactory(zaptest.NewLogger(t), cs)

	chains, err := cf.Chains(t.Name())
	require.NoError(t, err)

	chainA, chainB, chainC, chainD = chains[0].(*cosmos.CosmosChain), chains[1].(*cosmos.CosmosChain), chains[2].(*cosmos.CosmosChain), chains[3].(*cosmos.CosmosChain)

	r := newCosmosRlyFactory(t).Build(t, client, network)

	pathAB := fmt.Sprintf("%s-%s", chainName_A, chainName_B)
	pathBC := fmt.Sprintf("%s-%s", chainName_B, chainName_C)
	pathCD := fmt.Sprintf("%s-%s", chainName_C, chainName_D)

	ic := interchaintest.NewInterchain().
		AddChain(chainA).
		AddChain(chainB).
		AddChain(chainC).
		AddChain(chainD).
		AddRelayer(r, "relayer").
		AddLink(interchaintest.InterchainLink{
			Chain1:  chainA,
			Chain2:  chainB,
			Relayer: r,
			Path:    pathAB,
		}).
		AddLink(interchaintest.InterchainLink{
			Chain1:  chainB,
			Chain2:  chainC,
			Relayer: r,
			Path:    pathBC,
		}).
		AddLink(interchaintest.InterchainLink{
			Chain1:  chainC,
			Chain2:  chainD,
			Relayer: r,
			Path:    pathCD,
		})

	require.NoError(t, ic.Build(ctx, eRep, interchaintest.InterchainBuildOptions{
		TestName:          t.Name(),
		Client:            client,
		NetworkID:         network,
		BlockDatabaseFile: interchaintest.DefaultBlockDatabaseFilepath(),

		SkipPathCreation: false,
	}))
	t.Cleanup(func() {
		_ = ic.Close()
	})

	userFunds := sdk.NewInt(10_000_000_000)
	users := interchaintest.GetAndFundTestUsers(t, ctx, t.Name(), userFunds, chainA, chainB, chainC, chainD)

	abChan, err := ibc.GetTransferChannel(ctx, r, eRep, chainA.Config().ChainID, chainB.Config().ChainID)
	require.NoError(t, err)

	baChan := abChan.Counterparty

	cbChan, err := ibc.GetTransferChannel(ctx, r, eRep, chainC.Config().ChainID, chainB.Config().ChainID)
	require.NoError(t, err)

	bcChan := cbChan.Counterparty

	dcChan, err := ibc.GetTransferChannel(ctx, r, eRep, chainD.Config().ChainID, chainC.Config().ChainID)
	require.NoError(t, err)

	cdChan := dcChan.Counterparty

	// Start the relayer on both paths
	err = r.StartRelayer(ctx, eRep, pathAB, pathBC, pathCD)
	require.NoError(t, err)

	t.Cleanup(
		func() {
			err := r.StopRelayer(ctx, eRep)
			if err != nil {
				t.Logf("an error occured while stopping the relayer: %s", err)
			}
		},
	)

	// Get original account balances
	userA, userB, userC, userD := users[0], users[1], users[2], users[3]

	transferAmount := sdk.NewInt(100000)

	// Compose the prefixed denoms and ibc denom for asserting balances
	firstHopDenom := transfertypes.GetPrefixedDenom(baChan.PortID, baChan.ChannelID, chainA.Config().Denom)
	secondHopDenom := transfertypes.GetPrefixedDenom(cbChan.PortID, cbChan.ChannelID, firstHopDenom)
	thirdHopDenom := transfertypes.GetPrefixedDenom(dcChan.PortID, dcChan.ChannelID, secondHopDenom)

	firstHopDenomTrace := transfertypes.ParseDenomTrace(firstHopDenom)
	secondHopDenomTrace := transfertypes.ParseDenomTrace(secondHopDenom)
	thirdHopDenomTrace := transfertypes.ParseDenomTrace(thirdHopDenom)

	firstHopIBCDenom := firstHopDenomTrace.IBCDenom()
	secondHopIBCDenom := secondHopDenomTrace.IBCDenom()
	thirdHopIBCDenom := thirdHopDenomTrace.IBCDenom()

	firstHopEscrowAccount := sdk.MustBech32ifyAddressBytes(chainA.Config().Bech32Prefix, transfertypes.GetEscrowAddress(abChan.PortID, abChan.ChannelID))
	secondHopEscrowAccount := sdk.MustBech32ifyAddressBytes(chainB.Config().Bech32Prefix, transfertypes.GetEscrowAddress(bcChan.PortID, bcChan.ChannelID))
	thirdHopEscrowAccount := sdk.MustBech32ifyAddressBytes(chainC.Config().Bech32Prefix, transfertypes.GetEscrowAddress(cdChan.PortID, abChan.ChannelID))

	blocksToWait := 20

	t.Run("multi-hop a->b->c->d", func(t *testing.T) {
		// Send packet from Chain A->Chain B->Chain C->Chain D

		transfer := ibc.WalletAmount{
			Address: userB.FormattedAddress(),
			Denom:   chainA.Config().Denom,
			Amount:  transferAmount,
		}

		secondHopMetadata := &PacketMetadata{
			Forward: &ForwardMetadata{
				Receiver: userD.FormattedAddress(),
				Channel:  cdChan.ChannelID,
				Port:     cdChan.PortID,
			},
		}
		nextBz, err := json.Marshal(secondHopMetadata)
		require.NoError(t, err)
		next := string(nextBz)

		firstHopMetadata := &PacketMetadata{
			Forward: &ForwardMetadata{
				Receiver: userC.FormattedAddress(),
				Channel:  bcChan.ChannelID,
				Port:     bcChan.PortID,
				Next:     &next,
			},
		}

		memo, err := json.Marshal(firstHopMetadata)
		require.NoError(t, err)

		chainAHeight, err := chainA.Height(ctx)
		require.NoError(t, err)

		transferTx, err := chainA.SendIBCTransfer(ctx, abChan.ChannelID, userA.KeyName(), transfer, ibc.TransferOptions{Memo: string(memo)})
		require.NoError(t, err)
		_, err = testutil.PollForAck(ctx, chainA, chainAHeight, chainAHeight+30, transferTx.Packet)
		require.NoError(t, err)
		err = testutil.WaitForBlocks(ctx, blocksToWait, chainA)
		require.NoError(t, err)

		chainABalance, err := chainA.GetBalance(ctx, userA.FormattedAddress(), chainA.Config().Denom)
		require.NoError(t, err)

		chainBBalance, err := chainB.GetBalance(ctx, userB.FormattedAddress(), firstHopIBCDenom)
		require.NoError(t, err)

		chainCBalance, err := chainC.GetBalance(ctx, userC.FormattedAddress(), secondHopIBCDenom)
		require.NoError(t, err)

		chainDBalance, err := chainD.GetBalance(ctx, userD.FormattedAddress(), thirdHopIBCDenom)
		require.NoError(t, err)

		gasFees := chainA.GetGasFeesInNativeDenom(transferTx.GasSpent)
		expectedBalance := userFunds.Sub(transferAmount).Sub(sdk.NewInt(gasFees))
		require.Equal(t, expectedBalance, chainABalance)
		require.Equal(t, sdk.NewInt(0), chainBBalance)
		require.Equal(t, sdk.NewInt(0), chainCBalance)
		require.Equal(t, transferAmount, chainDBalance)

		firstHopEscrowBalance, err := chainA.GetBalance(ctx, firstHopEscrowAccount, chainA.Config().Denom)
		require.NoError(t, err)

		secondHopEscrowBalance, err := chainB.GetBalance(ctx, secondHopEscrowAccount, firstHopIBCDenom)
		require.NoError(t, err)

		thirdHopEscrowBalance, err := chainC.GetBalance(ctx, thirdHopEscrowAccount, secondHopIBCDenom)
		require.NoError(t, err)

		require.Equal(t, transferAmount, firstHopEscrowBalance)
		require.Equal(t, transferAmount, secondHopEscrowBalance)
		require.Equal(t, transferAmount, thirdHopEscrowBalance)
	})

	t.Run("multi-hop denom unwind d->c->b->a", func(t *testing.T) {
		// Send packet back from Chain D->Chain C->Chain B->Chain A
		transfer := ibc.WalletAmount{
			Address: userC.FormattedAddress(),
			Denom:   thirdHopIBCDenom,
			Amount:  transferAmount,
		}

		secondHopMetadata := &PacketMetadata{
			Forward: &ForwardMetadata{
				Receiver: userA.FormattedAddress(),
				Channel:  baChan.ChannelID,
				Port:     baChan.PortID,
			},
		}

		nextBz, err := json.Marshal(secondHopMetadata)
		require.NoError(t, err)

		next := string(nextBz)

		firstHopMetadata := &PacketMetadata{
			Forward: &ForwardMetadata{
				Receiver: userB.FormattedAddress(),
				Channel:  cbChan.ChannelID,
				Port:     cbChan.PortID,
				Next:     &next,
			},
		}

		memo, err := json.Marshal(firstHopMetadata)
		require.NoError(t, err)

		chainDHeight, err := chainD.Height(ctx)
		require.NoError(t, err)

		transferTx, err := chainD.SendIBCTransfer(ctx, dcChan.ChannelID, userD.KeyName(), transfer, ibc.TransferOptions{Memo: string(memo)})
		require.NoError(t, err)
		_, err = testutil.PollForAck(ctx, chainD, chainDHeight, chainDHeight+30, transferTx.Packet)
		require.NoError(t, err)
		err = testutil.WaitForBlocks(ctx, blocksToWait, chainA)
		require.NoError(t, err)

		// assert balances for user controlled wallets
		chainDBalance, err := chainD.GetBalance(ctx, userD.FormattedAddress(), thirdHopIBCDenom)
		require.NoError(t, err)

		chainCBalance, err := chainC.GetBalance(ctx, userC.FormattedAddress(), secondHopIBCDenom)
		require.NoError(t, err)

		chainBBalance, err := chainB.GetBalance(ctx, userB.FormattedAddress(), firstHopIBCDenom)
		require.NoError(t, err)

		chainABalance, err := chainA.GetBalance(ctx, userA.FormattedAddress(), chainA.Config().Denom)
		require.NoError(t, err)

		require.Equal(t, sdk.NewInt(0), chainDBalance)
		require.Equal(t, sdk.NewInt(0), chainCBalance)
		require.Equal(t, sdk.NewInt(0), chainBBalance)

		gasFees := chainA.GetGasFeesInNativeDenom(transferTx.GasSpent)
		expectedBalance := userFunds.Sub(sdk.NewInt(gasFees))
		require.Equal(t, expectedBalance, chainABalance)

		// assert balances for IBC escrow accounts
		firstHopEscrowBalance, err := chainA.GetBalance(ctx, firstHopEscrowAccount, chainA.Config().Denom)
		require.NoError(t, err)

		secondHopEscrowBalance, err := chainB.GetBalance(ctx, secondHopEscrowAccount, firstHopIBCDenom)
		require.NoError(t, err)

		thirdHopEscrowBalance, err := chainC.GetBalance(ctx, thirdHopEscrowAccount, secondHopIBCDenom)
		require.NoError(t, err)

		require.Equal(t, sdk.NewInt(0), firstHopEscrowBalance)
		require.Equal(t, sdk.NewInt(0), secondHopEscrowBalance)
		require.Equal(t, sdk.NewInt(0), thirdHopEscrowBalance)
	})

	t.Run("forward ack error refund", func(t *testing.T) {
		// Send a malformed packet with invalid receiver address from Chain A->Chain B->Chain C
		// This should succeed in the first hop and fail to make the second hop; funds should then be refunded to Chain A.
		transfer := ibc.WalletAmount{
			Address: userB.FormattedAddress(),
			Denom:   chainA.Config().Denom,
			Amount:  transferAmount,
		}

		metadata := &PacketMetadata{
			Forward: &ForwardMetadata{
				Receiver: "xyz1t8eh66t2w5k67kwurmn5gqhtq6d2ja0vp7jmmq", // malformed receiver address on Chain C
				Channel:  bcChan.ChannelID,
				Port:     bcChan.PortID,
			},
		}

		memo, err := json.Marshal(metadata)
		require.NoError(t, err)

		chainAHeight, err := chainA.Height(ctx)
		require.NoError(t, err)

		transferTx, err := chainA.SendIBCTransfer(ctx, abChan.ChannelID, userA.KeyName(), transfer, ibc.TransferOptions{Memo: string(memo)})
		require.NoError(t, err)
		_, err = testutil.PollForAck(ctx, chainA, chainAHeight, chainAHeight+25, transferTx.Packet)
		require.NoError(t, err)
		err = testutil.WaitForBlocks(ctx, blocksToWait, chainA)
		require.NoError(t, err)

		// assert balances for user controlled wallets
		chainABalance, err := chainA.GetBalance(ctx, userA.FormattedAddress(), chainA.Config().Denom)
		require.NoError(t, err)

		chainBBalance, err := chainB.GetBalance(ctx, userB.FormattedAddress(), firstHopIBCDenom)
		require.NoError(t, err)

		chainCBalance, err := chainC.GetBalance(ctx, userC.FormattedAddress(), secondHopIBCDenom)
		require.NoError(t, err)

		gasFees := 2 * chainA.GetGasFeesInNativeDenom(transferTx.GasSpent)
		expectedBalance := userFunds.Sub(sdk.NewInt(gasFees))
		require.Equal(t, expectedBalance, chainABalance)
		require.Equal(t, sdk.NewInt(0), chainBBalance)
		require.Equal(t, sdk.NewInt(0), chainCBalance)

		// assert balances for IBC escrow accounts
		firstHopEscrowBalance, err := chainA.GetBalance(ctx, firstHopEscrowAccount, chainA.Config().Denom)
		require.NoError(t, err)

		secondHopEscrowBalance, err := chainB.GetBalance(ctx, secondHopEscrowAccount, firstHopIBCDenom)
		require.NoError(t, err)

		require.Equal(t, sdk.NewInt(0), firstHopEscrowBalance)
		require.Equal(t, sdk.NewInt(0), secondHopEscrowBalance)
	})

	t.Run("forward timeout refund", func(t *testing.T) {
		// Send packet from Chain A->Chain B->Chain C with the timeout so low for B->C transfer that it can not make it from B to C, which should result in a refund from B to A after two retries.
		transfer := ibc.WalletAmount{
			Address: userB.FormattedAddress(),
			Denom:   chainA.Config().Denom,
			Amount:  transferAmount,
		}

		retries := uint8(2)
		metadata := &PacketMetadata{
			Forward: &ForwardMetadata{
				Receiver: userC.FormattedAddress(),
				Channel:  bcChan.ChannelID,
				Port:     bcChan.PortID,
				Retries:  &retries,
				Timeout:  1 * time.Second,
			},
		}

		memo, err := json.Marshal(metadata)
		require.NoError(t, err)

		chainAHeight, err := chainA.Height(ctx)
		require.NoError(t, err)

		transferTx, err := chainA.SendIBCTransfer(ctx, abChan.ChannelID, userA.KeyName(), transfer, ibc.TransferOptions{Memo: string(memo)})
		require.NoError(t, err)
		_, err = testutil.PollForAck(ctx, chainA, chainAHeight, chainAHeight+25, transferTx.Packet)
		require.NoError(t, err)
		err = testutil.WaitForBlocks(ctx, blocksToWait, chainA)
		require.NoError(t, err)

		// assert balances for user controlled wallets
		chainABalance, err := chainA.GetBalance(ctx, userA.FormattedAddress(), chainA.Config().Denom)
		require.NoError(t, err)

		chainBBalance, err := chainB.GetBalance(ctx, userB.FormattedAddress(), firstHopIBCDenom)
		require.NoError(t, err)

		chainCBalance, err := chainC.GetBalance(ctx, userC.FormattedAddress(), secondHopIBCDenom)
		require.NoError(t, err)

		gasFees := 3 * chainA.GetGasFeesInNativeDenom(transferTx.GasSpent)
		expectedBalance := userFunds.Sub(sdk.NewInt(gasFees))
		require.Equal(t, expectedBalance, chainABalance)
		require.Equal(t, sdk.NewInt(0), chainBBalance)
		require.Equal(t, sdk.NewInt(0), chainCBalance)

		firstHopEscrowBalance, err := chainA.GetBalance(ctx, firstHopEscrowAccount, chainA.Config().Denom)
		require.NoError(t, err)

		secondHopEscrowBalance, err := chainB.GetBalance(ctx, secondHopEscrowAccount, firstHopIBCDenom)
		require.NoError(t, err)

		require.Equal(t, sdk.NewInt(0), firstHopEscrowBalance)
		require.Equal(t, sdk.NewInt(0), secondHopEscrowBalance)
	})

	t.Run("multi-hop ack error refund", func(t *testing.T) {
		// Send a malformed packet with invalid receiver address from Chain A->Chain B->Chain C->Chain D
		// This should succeed in the first hop and second hop, then fail to make the third hop.
		// Funds should be refunded to Chain B and then to Chain A via acknowledgements with errors.
		transfer := ibc.WalletAmount{
			Address: userB.FormattedAddress(),
			Denom:   chainA.Config().Denom,
			Amount:  transferAmount,
		}

		secondHopMetadata := &PacketMetadata{
			Forward: &ForwardMetadata{
				Receiver: "xyz1t8eh66t2w5k67kwurmn5gqhtq6d2ja0vp7jmmq", // malformed receiver address on chain D
				Channel:  cdChan.ChannelID,
				Port:     cdChan.PortID,
			},
		}

		nextBz, err := json.Marshal(secondHopMetadata)
		require.NoError(t, err)

		next := string(nextBz)

		firstHopMetadata := &PacketMetadata{
			Forward: &ForwardMetadata{
				Receiver: userC.KeyName(),
				Channel:  bcChan.ChannelID,
				Port:     bcChan.PortID,
				Next:     &next,
			},
		}

		memo, err := json.Marshal(firstHopMetadata)
		require.NoError(t, err)

		chainAHeight, err := chainA.Height(ctx)
		require.NoError(t, err)

		transferTx, err := chainA.SendIBCTransfer(ctx, abChan.ChannelID, userA.KeyName(), transfer, ibc.TransferOptions{Memo: string(memo)})
		require.NoError(t, err)
		_, err = testutil.PollForAck(ctx, chainA, chainAHeight, chainAHeight+30, transferTx.Packet)
		require.NoError(t, err)
		err = testutil.WaitForBlocks(ctx, blocksToWait, chainA)
		require.NoError(t, err)

		// assert balances for user controlled wallets
		chainDBalance, err := chainD.GetBalance(ctx, userD.FormattedAddress(), thirdHopIBCDenom)
		require.NoError(t, err)

		chainCBalance, err := chainC.GetBalance(ctx, userC.FormattedAddress(), secondHopIBCDenom)
		require.NoError(t, err)

		chainBBalance, err := chainB.GetBalance(ctx, userB.FormattedAddress(), firstHopIBCDenom)
		require.NoError(t, err)

		chainABalance, err := chainA.GetBalance(ctx, userA.FormattedAddress(), chainA.Config().Denom)
		require.NoError(t, err)

		gasFees := 4 * chainA.GetGasFeesInNativeDenom(transferTx.GasSpent)
		expectedBalance := userFunds.Sub(sdk.NewInt(gasFees))
		require.Equal(t, expectedBalance, chainABalance)
		require.Equal(t, sdk.NewInt(0), chainBBalance)
		require.Equal(t, sdk.NewInt(0), chainCBalance)
		require.Equal(t, sdk.NewInt(0), chainDBalance)

		// assert balances for IBC escrow accounts
		firstHopEscrowBalance, err := chainA.GetBalance(ctx, firstHopEscrowAccount, chainA.Config().Denom)
		require.NoError(t, err)

		secondHopEscrowBalance, err := chainB.GetBalance(ctx, secondHopEscrowAccount, firstHopIBCDenom)
		require.NoError(t, err)

		thirdHopEscrowBalance, err := chainC.GetBalance(ctx, thirdHopEscrowAccount, secondHopIBCDenom)
		require.NoError(t, err)

		require.Equal(t, sdk.NewInt(0), firstHopEscrowBalance)
		require.Equal(t, sdk.NewInt(0), secondHopEscrowBalance)
		require.Equal(t, sdk.NewInt(0), thirdHopEscrowBalance)
	})

	t.Run("multi-hop through native chain ack error refund", func(t *testing.T) {
		// send normal IBC transfer from B->A to get funds in IBC denom, then do multihop A->B(native)->C->D
		// this lets us test the burn from escrow account on chain C and the escrow to escrow transfer on chain B.

		// Compose the prefixed denoms and ibc denom for asserting balances
		baDenom := transfertypes.GetPrefixedDenom(abChan.PortID, abChan.ChannelID, chainB.Config().Denom)
		bcDenom := transfertypes.GetPrefixedDenom(cbChan.PortID, cbChan.ChannelID, chainB.Config().Denom)
		cdDenom := transfertypes.GetPrefixedDenom(dcChan.PortID, dcChan.ChannelID, bcDenom)

		baDenomTrace := transfertypes.ParseDenomTrace(baDenom)
		bcDenomTrace := transfertypes.ParseDenomTrace(bcDenom)
		cdDenomTrace := transfertypes.ParseDenomTrace(cdDenom)

		baIBCDenom := baDenomTrace.IBCDenom()
		bcIBCDenom := bcDenomTrace.IBCDenom()
		cdIBCDenom := cdDenomTrace.IBCDenom()

		transfer := ibc.WalletAmount{
			Address: userA.FormattedAddress(),
			Denom:   chainB.Config().Denom,
			Amount:  transferAmount,
		}

		chainBHeight, err := chainB.Height(ctx)
		require.NoError(t, err)

		transferTx, err := chainB.SendIBCTransfer(ctx, baChan.ChannelID, userB.KeyName(), transfer, ibc.TransferOptions{})
		require.NoError(t, err)
		_, err = testutil.PollForAck(ctx, chainB, chainBHeight, chainBHeight+10, transferTx.Packet)
		require.NoError(t, err)
		err = testutil.WaitForBlocks(ctx, blocksToWait, chainB)
		require.NoError(t, err)

		// assert balance for user controlled wallet
		chainABalance, err := chainA.GetBalance(ctx, userA.FormattedAddress(), baIBCDenom)
		require.NoError(t, err)

		baEscrowBalance, err := chainB.GetBalance(
			ctx,
			sdk.MustBech32ifyAddressBytes(chainB.Config().Bech32Prefix, transfertypes.GetEscrowAddress(baChan.PortID, baChan.ChannelID)),
			chainB.Config().Denom,
		)
		require.NoError(t, err)

		require.Equal(t, transferAmount, chainABalance)
		require.Equal(t, transferAmount, baEscrowBalance)

		// Send a malformed packet with invalid receiver address from Chain A->Chain B->Chain C->Chain D
		// This should succeed in the first hop and second hop, then fail to make the third hop.
		// Funds should be refunded to Chain B and then to Chain A via acknowledgements with errors.
		transfer = ibc.WalletAmount{
			Address: userB.FormattedAddress(),
			Denom:   baIBCDenom,
			Amount:  transferAmount,
		}

		secondHopMetadata := &PacketMetadata{
			Forward: &ForwardMetadata{
				Receiver: "xyz1t8eh66t2w5k67kwurmn5gqhtq6d2ja0vp7jmmq", // malformed receiver address on chain D
				Channel:  cdChan.ChannelID,
				Port:     cdChan.PortID,
			},
		}

		nextBz, err := json.Marshal(secondHopMetadata)
		require.NoError(t, err)

		next := string(nextBz)

		firstHopMetadata := &PacketMetadata{
			Forward: &ForwardMetadata{
				Receiver: userC.FormattedAddress(),
				Channel:  bcChan.ChannelID,
				Port:     bcChan.PortID,
				Next:     &next,
			},
		}

		memo, err := json.Marshal(firstHopMetadata)
		require.NoError(t, err)

		chainAHeight, err := chainA.Height(ctx)
		require.NoError(t, err)

		transferTx, err = chainA.SendIBCTransfer(ctx, abChan.ChannelID, userA.KeyName(), transfer, ibc.TransferOptions{Memo: string(memo)})
		require.NoError(t, err)
		_, err = testutil.PollForAck(ctx, chainA, chainAHeight, chainAHeight+30, transferTx.Packet)
		require.NoError(t, err)
		err = testutil.WaitForBlocks(ctx, blocksToWait, chainA)
		require.NoError(t, err)

		// assert balances for user controlled wallets
		chainDBalance, err := chainD.GetBalance(ctx, userD.FormattedAddress(), cdIBCDenom)
		require.NoError(t, err)

		chainCBalance, err := chainC.GetBalance(ctx, userC.FormattedAddress(), bcIBCDenom)
		require.NoError(t, err)

		chainBBalance, err := chainB.GetBalance(ctx, userB.FormattedAddress(), chainB.Config().Denom)
		require.NoError(t, err)

		chainABalance, err = chainA.GetBalance(ctx, userA.FormattedAddress(), baIBCDenom)
		require.NoError(t, err)

		require.Equal(t, transferAmount, chainABalance)
		gasFees := 5 * chainB.GetGasFeesInNativeDenom(transferTx.GasSpent)
		expectedBalance := userFunds.Sub(transferAmount).Sub(sdk.NewInt(gasFees))
		require.Equal(t, expectedBalance, chainBBalance)
		require.Equal(t, sdk.NewInt(0), chainCBalance)
		require.Equal(t, sdk.NewInt(0), chainDBalance)

		// assert balances for IBC escrow accounts
		cdEscrowBalance, err := chainC.GetBalance(
			ctx,
			sdk.MustBech32ifyAddressBytes(chainC.Config().Bech32Prefix, transfertypes.GetEscrowAddress(cdChan.PortID, cdChan.ChannelID)),
			bcIBCDenom,
		)
		require.NoError(t, err)

		bcEscrowBalance, err := chainB.GetBalance(
			ctx,
			sdk.MustBech32ifyAddressBytes(chainB.Config().Bech32Prefix, transfertypes.GetEscrowAddress(bcChan.PortID, bcChan.ChannelID)),
			chainB.Config().Denom,
		)
		require.NoError(t, err)

		baEscrowBalance, err = chainB.GetBalance(
			ctx,
			sdk.MustBech32ifyAddressBytes(chainB.Config().Bech32Prefix, transfertypes.GetEscrowAddress(baChan.PortID, baChan.ChannelID)),
			chainB.Config().Denom,
		)
		require.NoError(t, err)

		require.Equal(t, transferAmount, baEscrowBalance)
		require.Equal(t, sdk.NewInt(0), bcEscrowBalance)
		require.Equal(t, sdk.NewInt(0), cdEscrowBalance)
	})
}
