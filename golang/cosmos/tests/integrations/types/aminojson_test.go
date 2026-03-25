package types_test

import (
	"context"
	"encoding/json"
	"reflect"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/cosmos/cosmos-proto/anyutil"
	gogoproto "github.com/cosmos/gogoproto/proto"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"

	v1beta1 "cosmossdk.io/api/cosmos/base/v1beta1"
	txv1beta1 "cosmossdk.io/api/cosmos/tx/v1beta1"
	signing_testutil "cosmossdk.io/x/tx/signing/testutil"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module/testutil"
	signingtypes "github.com/cosmos/cosmos-sdk/types/tx/signing"
	"github.com/cosmos/cosmos-sdk/x/auth"
	"github.com/cosmos/cosmos-sdk/x/auth/migrations/legacytx"
	"github.com/cosmos/cosmos-sdk/x/auth/signing"
	"github.com/cosmos/cosmos-sdk/x/auth/tx"
	"github.com/cosmos/cosmos-sdk/x/auth/vesting"
	authzmodule "github.com/cosmos/cosmos-sdk/x/authz/module"
	"github.com/cosmos/cosmos-sdk/x/bank"
	"github.com/cosmos/cosmos-sdk/x/gov"
	govv1beta1 "github.com/cosmos/cosmos-sdk/x/gov/types/v1beta1"
	"github.com/cosmos/cosmos-sdk/x/params"
	"github.com/cosmos/cosmos-sdk/x/params/types/proposal"
	"github.com/cosmos/cosmos-sdk/x/slashing"
	"github.com/cosmos/cosmos-sdk/x/staking"
	clienttypes "github.com/cosmos/ibc-go/v8/modules/core/02-client/types"
	channeltypes "github.com/cosmos/ibc-go/v8/modules/core/04-channel/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/app/txconfig"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset"
	swingsettypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vtransfer"
)

func TestAminoJSON_LegacyParity(t *testing.T) {
	encCfg := testutil.MakeTestEncodingConfig(
		auth.AppModuleBasic{},
		vesting.AppModuleBasic{},
		bank.AppModuleBasic{},
		gov.AppModuleBasic{},
		slashing.AppModuleBasic{},
		staking.AppModuleBasic{},
		authzmodule.AppModuleBasic{},
		params.AppModuleBasic{},
		vstorage.AppModuleBasic{},
		swingset.AppModuleBasic{},
		vibc.AppModuleBasic{},
		vbank.AppModuleBasic{},
		vtransfer.AppModuleBasic{},
	)
	legacytx.RegressionTestingAminoCodec = encCfg.Amino

	signingOpts, err := tx.NewDefaultSigningOptions()
	require.NoError(t, err)

	handler, aj, err := txconfig.NewAminoHandlerWithCustomEncoders(signingOpts, txconfig.CustomAminoFieldEncoders)
	require.NoError(t, err)

	addr1 := sdk.AccAddress("addr1")
	deliverMessages := &swingsettypes.Messages{Messages: []string{"{}"}, Nums: []uint64{2}, Ack: 1}
	emptyDeliverMessages := &swingsettypes.Messages{Messages: []string{}, Nums: []uint64{}, Ack: 1}
	zeroDeliverMessages := &swingsettypes.Messages{Messages: []string{"{}"}, Nums: []uint64{2}, Ack: 0}
	coins := sdk.Coins{sdk.NewInt64Coin("uatom", 1000)}

	installBundleMsg := swingsettypes.NewMsgInstallBundle("{}", addr1)
	err = installBundleMsg.ValidateBasic()
	require.NoError(t, err)

	compressedInstallBundleMsg := new(swingsettypes.MsgInstallBundle)
	*compressedInstallBundleMsg = *installBundleMsg
	err = compressedInstallBundleMsg.Compress()
	require.NoError(t, err)

	coreEvalProposal := swingsettypes.NewCoreEvalProposal("test core eval", "Some core eval", []swingsettypes.CoreEval{{JsonPermits: "true", JsCode: ";"}})
	err = coreEvalProposal.ValidateBasic()
	require.NoError(t, err)

	coreEvalGovMsg, err := govv1beta1.NewMsgSubmitProposal(coreEvalProposal, coins, addr1)
	require.NoError(t, err)

	paramsChangeProposal := proposal.NewParameterChangeProposal("title", "description", []proposal.ParamChange{proposal.NewParamChange("swingset", "foo", "bar")})
	err = paramsChangeProposal.ValidateBasic()
	require.NoError(t, err)

	paramsChangeGovMsg, err := govv1beta1.NewMsgSubmitProposal(paramsChangeProposal, coins, addr1)
	require.NoError(t, err)

	ibcPacket := channeltypes.NewPacket(
		[]byte("data"),
		987654321098765432,
		"port-src", "channel-13",
		"port-dst", "channel-42",
		clienttypes.Height{},
		123456789012345678,
	)

	cases := map[string]struct {
		gogo gogoproto.Message
		// If there are any empty slices, the marshal round trip to bytes will likely transform these into nil slices
		roundTripUnequal bool
	}{
		"swingset/msg_deliver_inbound/normal":    {gogo: swingsettypes.NewMsgDeliverInbound(deliverMessages, addr1)},
		"swingset/msg_deliver_inbound/empty":     {gogo: swingsettypes.NewMsgDeliverInbound(emptyDeliverMessages, addr1), roundTripUnequal: true},
		"swingset/msg_deliver_inbound/zero":      {gogo: swingsettypes.NewMsgDeliverInbound(zeroDeliverMessages, addr1)},
		"swingset/msg_wallet_action":             {gogo: swingsettypes.NewMsgWalletAction(addr1, "{}")},
		"swingset/msg_wallet_spend_action":       {gogo: swingsettypes.NewMsgWalletSpendAction(addr1, "{}")},
		"swingset/msg_provision/normal":          {gogo: swingsettypes.NewMsgProvision("foo", addr1, []string{"bar"}, addr1)},
		"swingset/msg_provision/empty":           {gogo: swingsettypes.NewMsgProvision("foo", addr1, []string{}, addr1), roundTripUnequal: true},
		"swingset/msg_install_bundle":            {gogo: installBundleMsg},
		"swingset/msg_install_bundle/compressed": {gogo: compressedInstallBundleMsg},
		"swingset/gov/core_eval_proposal":        {gogo: coreEvalGovMsg},
		"swingset/gov/params_change_proposal":    {gogo: paramsChangeGovMsg},
		"vibc/msg_send_packet":                   {gogo: vibc.NewMsgSendPacket(ibcPacket, addr1)},
	}

	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			gogoMsg := tc.gogo

			// Convert gogoproto into new proto msg like tx would
			anyGogoMsg, err := codectypes.NewAnyWithValue(gogoMsg)
			require.NoError(t, err)

			protoMsg, err := anyutil.Unpack(&anypb.Any{
				TypeUrl: anyGogoMsg.TypeUrl,
				Value:   anyGogoMsg.Value,
			}, encCfg.InterfaceRegistry, nil)
			require.NoError(t, err)

			protoBz, err := proto.Marshal(protoMsg)
			require.NoError(t, err)

			// Sanity check
			gogoType := reflect.TypeOf(gogoMsg).Elem()
			newGogo := reflect.New(gogoType).Interface().(gogoproto.Message)
			err = encCfg.Codec.Unmarshal(protoBz, newGogo)
			require.NoError(t, err)
			if tc.roundTripUnequal {
				require.NotEqual(t, gogoMsg, newGogo)
			} else {
				require.Equal(t, gogoMsg, newGogo)
			}

			// Check amino json encoding matches
			anyProtoMsg, err := anyutil.New(protoMsg)
			require.NoError(t, err)

			legacyAminoJSON, err := encCfg.Amino.MarshalJSON(gogoMsg)
			require.NoError(t, err)
			legacyAminoJSON = sortJSON(t, legacyAminoJSON)
			aminoJSON, err := aj.Marshal(anyProtoMsg)
			require.NoError(t, err)
			require.Equal(t, string(legacyAminoJSON), string(aminoJSON))

			handlerOptions := signing_testutil.HandlerArgumentOptions{
				ChainID:       "test-chain",
				Memo:          "sometestmemo",
				Msg:           protoMsg,
				AccNum:        1,
				AccSeq:        2,
				SignerAddress: "signerAddress",
				Fee: &txv1beta1.Fee{
					Amount: []*v1beta1.Coin{{Denom: "uatom", Amount: "1000"}},
				},
			}

			signerData, txData, err := signing_testutil.MakeHandlerArguments(handlerOptions)
			require.NoError(t, err)

			signBz, err := handler.GetSignBytes(context.Background(), signerData, txData)
			require.NoError(t, err)

			legacyHandler := tx.NewSignModeLegacyAminoJSONHandler()
			txBuilder := encCfg.TxConfig.NewTxBuilder()
			require.NoError(t, txBuilder.SetMsgs([]sdk.Msg{gogoMsg}...))
			txBuilder.SetMemo(handlerOptions.Memo)
			txBuilder.SetFeeAmount(sdk.Coins{sdk.NewInt64Coin("uatom", 1000)})
			theTx := txBuilder.GetTx()

			legacySigningData := signing.SignerData{
				ChainID:       handlerOptions.ChainID,
				Address:       handlerOptions.SignerAddress,
				AccountNumber: handlerOptions.AccNum,
				Sequence:      handlerOptions.AccSeq,
			}
			legacySignBz, err := legacyHandler.GetSignBytes(signingtypes.SignMode_SIGN_MODE_LEGACY_AMINO_JSON,
				legacySigningData, theTx)
			require.NoError(t, err)
			require.Equal(t, string(legacySignBz), string(signBz))
		})
	}
}

func sortJSON(t require.TestingT, bz []byte) []byte {
	var c interface{}
	err := json.Unmarshal(bz, &c)
	require.NoError(t, err)
	bz, err = json.Marshal(c)
	require.NoError(t, err)
	return bz
}
