package vstorage

import (
	"context"
	"encoding/json"

	"cosmossdk.io/core/appmodule"
	"github.com/grpc-ecosystem/grpc-gateway/runtime"
	"github.com/spf13/cobra"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/client/cli"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	cdctypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/types/module"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// type check to ensure the interface is properly implemented
var (
	_ module.AppModule          = AppModule{}
	_ module.HasGenesis         = AppModule{}
	_ module.AppModuleBasic     = AppModuleBasic{}
	_ appmodule.HasBeginBlocker = AppModule{}
	_ appmodule.HasEndBlocker   = AppModule{}
)

// app module Basics object
type AppModuleBasic struct {
}

func (AppModuleBasic) Name() string {
	return ModuleName
}

func (AppModuleBasic) RegisterLegacyAminoCodec(cdc *codec.LegacyAmino) {
}

// RegisterInterfaces registers the module's interface types
func (b AppModuleBasic) RegisterInterfaces(registry cdctypes.InterfaceRegistry) {
}

// DefaultGenesis returns default genesis state as raw bytes for the deployment
func (AppModuleBasic) DefaultGenesis(cdc codec.JSONCodec) json.RawMessage {
	return cdc.MustMarshalJSON(DefaultGenesisState())
}

// Validation check of the Genesis
func (AppModuleBasic) ValidateGenesis(cdc codec.JSONCodec, config client.TxEncodingConfig, bz json.RawMessage) error {
	var data types.GenesisState
	err := cdc.UnmarshalJSON(bz, &data)
	if err != nil {
		return err
	}
	// Once json successfully marshalled, passes along to genesis.go
	return ValidateGenesis(&data)
}

func (AppModuleBasic) RegisterGRPCGatewayRoutes(clientCtx client.Context, mux *runtime.ServeMux) {
	_ = types.RegisterQueryHandlerClient(context.Background(), mux, types.NewQueryClient(clientCtx))
}

// Get the root query command of this module
func (AppModuleBasic) GetQueryCmd() *cobra.Command {
	return cli.GetQueryCmd(StoreKey)
}

// Get the root tx command of this module
func (AppModuleBasic) GetTxCmd() *cobra.Command {
	return nil
}

type AppModule struct {
	AppModuleBasic
	keeper Keeper
}

// IsAppModule implements the appmodule.AppModule interface.
func (am AppModule) IsAppModule() {}

// IsOnePerModuleType is a marker function just indicates that this is a one-per-module type.
func (am AppModule) IsOnePerModuleType() {}

// NewAppModule creates a new AppModule Object
func NewAppModule(k Keeper) AppModule {
	am := AppModule{
		AppModuleBasic: AppModuleBasic{},
		keeper:         k,
	}
	return am
}

func (AppModule) Name() string {
	return ModuleName
}

func (am AppModule) RegisterInvariants(ir sdk.InvariantRegistry) {}

func (am AppModule) RegisterServices(cfg module.Configurator) {
	querier := keeper.Querier{Keeper: am.keeper}
	types.RegisterQueryServer(cfg.QueryServer(), querier)
}

func (AppModule) ConsensusVersion() uint64 { return 1 }

func (am AppModule) BeginBlock(ctx context.Context) error {
	return am.keeper.NewChangeBatch(sdk.UnwrapSDKContext(ctx))
}

func (am AppModule) EndBlock(ctx context.Context) error {
	return am.keeper.FlushChangeEvents(sdk.UnwrapSDKContext(ctx))
}

func (am AppModule) InitGenesis(ctx sdk.Context, cdc codec.JSONCodec, data json.RawMessage) {
	var genesisState types.GenesisState
	if err := cdc.UnmarshalJSON(data, &genesisState); err != nil {
		panic(err)
	}
	if err := InitGenesis(ctx, am.keeper, &genesisState); err != nil {
		panic(err)
	}
}

func (am AppModule) ExportGenesis(ctx sdk.Context, cdc codec.JSONCodec) json.RawMessage {
	gs, err := ExportGenesis(ctx, am.keeper)
	if err != nil {
		panic(err)
	}
	return cdc.MustMarshalJSON(gs)
}
