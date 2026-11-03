package keeper

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
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
	return m.MigrateLegacyParams(ctx)
}

func (m Migrator) setUpdatedParams(ctx sdk.Context, params types.Params) error {
	newParams, err := types.UpdateParams(params)
	if err != nil {
		return err
	}
	m.keeper.SetParams(ctx, newParams)
	return nil
}

// MigrateLegacyParams migrates params from x/params into the swingset store.
func (m Migrator) MigrateLegacyParams(ctx sdk.Context) error {
	var params types.Params
	m.keeper.legacySubspace.GetParamSet(ctx, &params)
	return m.setUpdatedParams(ctx, params)
}

// MigrateParams fills missing params in the swingset store with defaults.
func (m Migrator) MigrateParams(ctx sdk.Context) error {
	params := m.keeper.GetParams(ctx)
	return m.setUpdatedParams(ctx, params)
}
