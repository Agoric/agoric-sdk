package lien

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func DefaultGenesisState() types.GenesisState {
	return types.GenesisState{}
}

func ValidateGenesisState(genesisState types.GenesisState) error {
	for _, lien := range genesisState.Liens {
		_, err := sdk.AccAddressFromBech32(lien.Address)
		if err != nil {
			return err
		}
	}
	return nil
}

func InitGenesis(ctx sdk.Context, keeper Keeper, genesisState types.GenesisState) {
	for _, lien := range genesisState.Liens {
		keeper.SetAccountLien(ctx, lien)
	}
}

func ExportGenesis(ctx sdk.Context, keeper Keeper) types.GenesisState {
	genesisState := types.GenesisState{}
	keeper.IterateAccountLiens(ctx, func(lien types.AccountLien) bool {
		genesisState.Liens = append(genesisState.Liens, lien)
		return false
	})
	return genesisState
}
