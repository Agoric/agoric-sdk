package loc

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/loc/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func DefaultGenesisState() types.GenesisState {
	return types.GenesisState{}
}

func ValidateGenesis(genesisState types.GenesisState) error {
	for _, loc := range genesisState.AccountLoc {
		_, err := sdk.AccAddressFromBech32(loc.Address)
		if err != nil {
			return err
		}
	}
	return nil
}

func InitGenesis(ctx sdk.Context, keeper Keeper, genesisState types.GenesisState) {
	for _, accLoc := range genesisState.AccountLoc {
		addr, err := sdk.AccAddressFromBech32(accLoc.GetAddress())
		if err != nil {
			panic(err) // not possible if genesis state was validated
		}
		loc := types.Loc{
			Collateral: accLoc.Loc.Collateral,
			Loan:       accLoc.Loc.Loan,
		}
		keeper.SetLoc(ctx, addr, types.Loc{}, loc)
	}
}

func ExportGenesis(ctx sdk.Context, keeper Keeper) types.GenesisState {
	genesisState := types.GenesisState{}
	keeper.IterateLoc(ctx, func(addr sdk.AccAddress, loc types.Loc) bool {
		accLoC := types.AccountLoc{
			Address: addr.String(),
			Loc:     &loc,
		}
		genesisState.AccountLoc = append(genesisState.AccountLoc, &accLoC)
		return false
	})
	return genesisState
}
