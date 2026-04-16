package vbank

import (
	"context"
	"encoding/json"
	stdlog "log"

	"cosmossdk.io/core/appmodule"
	"github.com/grpc-ecosystem/grpc-gateway/runtime"
	"github.com/spf13/cobra"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/client/cli"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	cdctypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/types/module"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// type check to ensure the interface is properly implemented
var (
	_ module.AppModule        = AppModule{}
	_ module.AppModuleBasic   = AppModuleBasic{}
	_ module.HasGenesis       = AppModule{}
	_ appmodule.HasEndBlocker = AppModule{}
)

// app module Basics object
type AppModuleBasic struct {
}

// IsAppModule implements the appmodule.AppModule interface.
func (am AppModule) IsAppModule() {}

// IsOnePerModuleType is a marker function just indicates that this is a one-per-module type.
func (am AppModule) IsOnePerModuleType() {}

func (AppModuleBasic) Name() string {
	return ModuleName
}

func (AppModuleBasic) RegisterLegacyAminoCodec(cdc *codec.LegacyAmino) {
	RegisterCodec(cdc)
}

// RegisterInterfaces registers the module's interface types
func (b AppModuleBasic) RegisterInterfaces(registry cdctypes.InterfaceRegistry) {
	types.RegisterInterfaces(registry)
}

// DefaultGenesis returns default genesis state as raw bytes for the deployment
func (AppModuleBasic) DefaultGenesis(cdc codec.JSONCodec) json.RawMessage {
	return cdc.MustMarshalJSON(DefaultGenesisState())
}

// Validation check of the Genesis
func (AppModuleBasic) ValidateGenesis(cdc codec.JSONCodec, config client.TxEncodingConfig, bz json.RawMessage) error {
	var data types.GenesisState
	if err := cdc.UnmarshalJSON(bz, &data); err != nil {
		return err
	}
	return ValidateGenesis(&data)
}

func (AppModuleBasic) RegisterGRPCGatewayRoutes(clientCtx client.Context, mux *runtime.ServeMux) {
	_ = types.RegisterQueryHandlerClient(context.Background(), mux, types.NewQueryClient(clientCtx))
}

// GetTxCmd implements AppModuleBasic interface
func (AppModuleBasic) GetTxCmd() *cobra.Command {
	return nil
}

// GetQueryCmd implements AppModuleBasic interface
func (AppModuleBasic) GetQueryCmd() *cobra.Command {
	return cli.GetQueryCmd()
}

type AppModule struct {
	AppModuleBasic
	keeper Keeper
}

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

func (AppModule) ConsensusVersion() uint64 { return 2 }

// EndBlock implements the AppModule interface
func (am AppModule) EndBlock(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)

	// Prune the AddressToUpdate map to only include module accounts.  We prune
	// only after recording and consolidating all account updates to minimize the
	// number of account keeper queries.
	filteredAddresses := make(map[string]sdk.Coins, len(am.keeper.AddressToUpdate))
	adStore := am.keeper.OpenAddressToUpdateStore(sdkCtx)
	iterator := adStore.Iterator(nil, nil)
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		addrBz := iterator.Key()
		addr, err := am.keeper.AddressCodec().BytesToString(addrBz)
		if err != nil {
			return err
		}
		if am.keeper.IsAllowedMonitoringAccount(sdkCtx, addr) {
			// We're committed to monitor this address, so parse the denoms.
			denomsBz := iterator.Value()
			denoms, err := sdk.ParseCoinsNormalized(string(denomsBz))
			if err != nil {
				return err
			}
			filteredAddresses[addr] = denoms
		}
	}

	// Dump all the addressToBalances entries to SwingSet.
	action, err := getBalanceUpdate(sdkCtx, am.keeper, filteredAddresses)
	if err != nil {
		return err
	}
	if action != nil {
		err := am.PushAction(sdkCtx, action)
		if err != nil {
			return err
		}
	}

	if err := am.keeper.DistributeRewards(sdkCtx); err != nil {
		stdlog.Println("Cannot distribute rewards", err.Error())
		return err
	}

	return nil
}

// RegisterInvariants implements the AppModule interface
func (AppModule) RegisterInvariants(ir sdk.InvariantRegistry) {
	// TODO
}

// RegisterServices registers module services.
func (am AppModule) RegisterServices(cfg module.Configurator) {
	tx := &types.UnimplementedMsgServer{}
	types.RegisterMsgServer(cfg.MsgServer(), tx)
	types.RegisterQueryServer(cfg.QueryServer(), am.keeper)

	m := keeper.NewMigrator(am.keeper)
	err := cfg.RegisterMigration(types.ModuleName, 1, m.Migrate1to2)
	if err != nil {
		panic(err)
	}
}

// InitGenesis performs genesis initialization for the ibc-transfer module. It returns
// no validator updates.
func (am AppModule) InitGenesis(ctx sdk.Context, cdc codec.JSONCodec, data json.RawMessage) {
	var genesisState types.GenesisState
	cdc.MustUnmarshalJSON(data, &genesisState)
	InitGenesis(ctx, am.keeper, &genesisState)
}

// ExportGenesis returns the exported genesis state as raw bytes for the ibc-transfer
// module.
func (am AppModule) ExportGenesis(ctx sdk.Context, cdc codec.JSONCodec) json.RawMessage {
	gs, err := ExportGenesis(ctx, am.keeper)
	if err != nil {
		panic(err)
	}
	return cdc.MustMarshalJSON(gs)
}
