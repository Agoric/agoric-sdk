package vpurse

import (
	// "fmt"

	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vpurse/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	abci "github.com/tendermint/tendermint/abci/types"
)

func NewGenesisState() *types.GenesisState {
	return &types.GenesisState{
		BootstrapAddress: "",
		BootstrapValue:   sdk.NewInt(0),
		DonationValue:    sdk.NewInt(0),
	}
}

func ValidateGenesis(data *types.GenesisState) error {
	if data == nil {
		return fmt.Errorf("vpurse genesis data cannot be nil")
	}
	if len(data.BootstrapAddress) > 0 {
		if _, err := sdk.AccAddressFromBech32(data.BootstrapAddress); err != nil {
			return fmt.Errorf("vpurse genesis invalid bootstrapAdddress %s: %w", data.BootstrapAddress, err)
		}
	}
	if data.BootstrapValue.IsNil() {
		return fmt.Errorf("vpurse genesis bootstrapValue cannot be nil")
	}
	if data.BootstrapValue.IsNegative() {
		return fmt.Errorf("vpurse genesis bootstrapValue %s cannot be negative", data.DonationValue.String())
	}
	if data.DonationValue.IsNil() {
		return fmt.Errorf("vpurse genesis donationValue cannot be nil")
	}
	if data.DonationValue.IsNegative() {
		return fmt.Errorf("vpurse genesis donationValue %s cannot be negative", data.DonationValue.String())
	}
	return nil
}

func DefaultGenesisState() *types.GenesisState {
	gs := NewGenesisState()
	fmt.Println("default gen", gs)
	return gs
}

func InitGenesis(ctx sdk.Context, keeper Keeper, data *types.GenesisState) []abci.ValidatorUpdate {
	keeper.SetGenesis(ctx, *data)
	fmt.Println("initialising gen", *data)
	return []abci.ValidatorUpdate{}
}

func ExportGenesis(ctx sdk.Context, k Keeper) *types.GenesisState {
	gs := k.GetGenesis(ctx)
	fmt.Println("exporting gen", gs)
	return &gs
}
