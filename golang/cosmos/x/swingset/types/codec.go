package types

import (
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/codec/legacy"
	cdctypes "github.com/cosmos/cosmos-sdk/codec/types"
	cryptocodec "github.com/cosmos/cosmos-sdk/crypto/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/msgservice"
	govv1beta1 "github.com/cosmos/cosmos-sdk/x/gov/types/v1beta1"
)

var (
	amino = codec.NewLegacyAmino()

	// ModuleCdc references the global x/swingset module codec. Note, the codec should
	// ONLY be used in certain instances of tests and for JSON encoding as Amino is
	// still used for that purpose.
	//
	// The actual codec used for serialization should be provided to x/swingset and
	// defined at the application level.
	ModuleAminoCdc = codec.NewAminoCodec(amino)
)

func init() {
	RegisterCodec(amino)
	cryptocodec.RegisterCrypto(amino)
	amino.Seal()
}

// RegisterCodec registers concrete types on the Amino codec
func RegisterCodec(cdc *codec.LegacyAmino) {
	legacy.RegisterAminoMsg(cdc, &MsgDeliverInbound{}, ModuleName+"/DeliverInbound")
	legacy.RegisterAminoMsg(cdc, &MsgProvision{}, ModuleName+"/Provision")
	legacy.RegisterAminoMsg(cdc, &MsgWalletAction{}, ModuleName+"/WalletAction")
	legacy.RegisterAminoMsg(cdc, &MsgWalletSpendAction{}, ModuleName+"/WalletSpendAction")
	legacy.RegisterAminoMsg(cdc, &MsgInstallBundle{}, ModuleName+"/InstallBundle")
}

// RegisterInterfaces registers the x/swingset interfaces types with the interface registry
func RegisterInterfaces(registry cdctypes.InterfaceRegistry) {
	registry.RegisterImplementations((*sdk.Msg)(nil),
		&MsgDeliverInbound{},
		&MsgProvision{},
		&MsgWalletAction{},
		&MsgWalletSpendAction{},
		&MsgInstallBundle{},
	)
	registry.RegisterImplementations(
		(*govv1beta1.Content)(nil),
		&CoreEvalProposal{},
	)
	msgservice.RegisterMsgServiceDesc(registry, &_Msg_serviceDesc)
}
