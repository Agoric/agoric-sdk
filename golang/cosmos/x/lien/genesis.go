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
	for _, accLien := range genesisState.Liens {
		addr, err := sdk.AccAddressFromBech32(accLien.GetAddress())
		if err != nil {
			panic(err) // not possible if genesis state was validated
		}
		lien := types.Lien{
			Coins: accLien.GetLien(),
		}
		keeper.SetLien(ctx, addr, lien)
	}
}

func ExportGenesis(ctx sdk.Context, keeper Keeper) types.GenesisState {
	genesisState := types.GenesisState{}
	keeper.IterateLiens(ctx, func(addr sdk.AccAddress, lien types.Lien) bool {
		accLien := types.AccountLien{
			Address: addr.String(),
			Lien:    lien.GetCoins(),
		}
		genesisState.Liens = append(genesisState.Liens, accLien)
		return false
	})
	return genesisState
}
