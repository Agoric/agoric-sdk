package lien

import (
	"encoding/json"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"
	"github.com/gorilla/mux"
	"github.com/grpc-ecosystem/grpc-gateway/runtime"
	"github.com/spf13/cobra"
	abci "github.com/tendermint/tendermint/abci/types"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"
)

var (
	_ module.AppModuleBasic = AppModuleBasic{}
	_ module.AppModule      = AppModule{}
)

// AppModuleBasic is the concrete type implementing module.AppModuleBasic.
type AppModuleBasic struct {
}

// Name implements the module.AppModuleBasic interface.
func (AppModuleBasic) Name() string {
	return types.ModuleName
}

func (AppModuleBasic) RegisterLegacyAminoCodec(cdc *codec.LegacyAmino) {
}

func (AppModuleBasic) RegisterInterfaces(_ codectypes.InterfaceRegistry) {
}

func (AppModuleBasic) DefaultGenesis(cdc codec.JSONCodec) json.RawMessage {
	genesisState := DefaultGenesisState()
	return cdc.MustMarshalJSON(&genesisState)
}

func (AppModuleBasic) ValidateGenesis(cdc codec.JSONCodec, config client.TxEncodingConfig, data json.RawMessage) error {
	var genesisState types.GenesisState
	if err := cdc.UnmarshalJSON(data, &genesisState); err != nil {
		return fmt.Errorf("failed to unmarshal %s genesis state: %s", types.ModuleName, err)
	}
	return ValidateGenesis(genesisState)
}

func (AppModuleBasic) RegisterRESTRoutes(_ client.Context, _ *mux.Router) {
}

func (AppModuleBasic) RegisterGRPCGatewayRoutes(_ client.Context, _ *runtime.ServeMux) {
}

func (AppModuleBasic) GetTxCmd() *cobra.Command {
	return nil
}

func (AppModuleBasic) GetQueryCmd() *cobra.Command {
	return nil
}

type AppModule struct {
	AppModuleBasic
	keeper Keeper
}

func (am AppModule) InitGenesis(ctx sdk.Context, cdc codec.JSONCodec, data json.RawMessage) []abci.ValidatorUpdate {
	var genesisState types.GenesisState
	cdc.MustUnmarshalJSON(data, &genesisState)
	InitGenesis(ctx, am.keeper, genesisState)
	return []abci.ValidatorUpdate{}
}

func (am AppModule) ExportGenesis(ctx sdk.Context, cdc codec.JSONCodec) json.RawMessage {
	genesisState := ExportGenesis(ctx, am.keeper)
	return cdc.MustMarshalJSON(&genesisState)
}

func (am AppModule) RegisterInvariants(_ sdk.InvariantRegistry) {
}

func (am AppModule) Route() sdk.Route {
	return sdk.Route{}
}

func (am AppModule) QuerierRoute() string {
	return ""
}

func (am AppModule) LegacyQuerierHandler(*codec.LegacyAmino) sdk.Querier {
	return nil
}

func (am AppModule) RegisterServices(module.Configurator) {
}

func (am AppModule) ConsensusVersion() uint64 {
	return 1
}

func (am AppModule) BeginBlock(sdk.Context, abci.RequestBeginBlock) {
}

func (am AppModule) EndBlock(sdk.Context, abci.RequestEndBlock) []abci.ValidatorUpdate {
	return []abci.ValidatorUpdate{}
}

func NewAppModule(k Keeper) module.AppModule {
	return AppModule{keeper: k}
}
