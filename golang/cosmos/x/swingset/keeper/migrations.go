package keeper

import (
	v32 "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/legacy/v32"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// Migrator handles in-place store migrations.
type Migrator struct {
	keeper Keeper
}

// NewMigrator returns a new migrator based on the keeper.
func NewMigrator(keeper Keeper) Migrator {
	return Migrator{keeper: keeper}
}

// Migrate1to2 migrates from version 1 to 2.
func (m Migrator) Migrate1to2(ctx sdk.Context) error {
	params := m.keeper.GetParams(ctx)
	newParams, err := v32.UpdateParams(params)
	if err != nil {
		return err
	}
	m.keeper.SetParams(ctx, newParams)
	return nil
}
