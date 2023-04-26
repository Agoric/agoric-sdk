package lien

import (
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"

	"github.com/cosmos/cosmos-sdk/testutil/testdata"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func mkcoin(denom string) func(int64) sdk.Coin {
	return func(amt int64) sdk.Coin { return sdk.NewInt64Coin(denom, amt) }
}

var (
	ubld  = mkcoin("ubld")
	urun  = mkcoin("urun")
	inval = func(amt int64) sdk.Coin { return sdk.Coin{Denom: "x", Amount: sdk.NewInt(amt)} }
	coins = sdk.NewCoins
)

func TestDefaultGenesis(t *testing.T) {
	defaultGenesisState := DefaultGenesisState()
	if err := ValidateGenesis(defaultGenesisState); err != nil {
		t.Errorf("DefaultGenesisState did not validate %v: %e", defaultGenesisState, err)
	}
}

func TestValidateGenesis(t *testing.T) {
	_, _, addr1 := testdata.KeyTestPubAddr()
	_, _, addr2 := testdata.KeyTestPubAddr()
	for _, tt := range []struct {
		name  string
		state types.GenesisState
		fail  bool
	}{
		{
			name:  "empty",
			state: types.GenesisState{},
		},
		{
			name: "typical",
			state: types.GenesisState{
				Liens: []types.AccountLien{
					{Address: addr1.String(), Lien: &types.Lien{
						Coins:     coins(ubld(123)),
						Delegated: coins(ubld(456)),
					}},
					{Address: addr2.String(), Lien: &types.Lien{
						Coins:     coins(ubld(246), urun(135)),
						Delegated: coins(),
					}},
				},
			},
		},
		{
			name: "bad addr",
			state: types.GenesisState{
				Liens: []types.AccountLien{
					{Address: "x", Lien: &types.Lien{}},
				},
			},
			fail: true,
		},
		{
			name: "bad coins",
			state: types.GenesisState{
				Liens: []types.AccountLien{
					{
						Address: addr1.String(),
						Lien:    &types.Lien{Coins: []sdk.Coin{inval(6)}},
					},
				},
			},
			fail: true,
		},
		{
			name: "bad delegated",
			state: types.GenesisState{
				Liens: []types.AccountLien{
					{
						Address: addr2.String(),
						Lien:    &types.Lien{Delegated: []sdk.Coin{inval(6)}},
					},
				},
			},
			fail: true,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateGenesis(tt.state)
			switch {
			case err != nil && !tt.fail:
				t.Errorf("invalid genesis state %v: %v", tt.state, err)
			case err == nil && tt.fail:
				t.Errorf("expected invalid genesis %v", tt.state)
			}
		})
	}
}
