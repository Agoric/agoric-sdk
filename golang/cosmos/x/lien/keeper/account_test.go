package keeper

import (
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

var (
	coins = sdk.NewCoins
)

func testCoin(shortDenom string) func(int64) sdk.Coin {
	return func(amt int64) sdk.Coin {
		return sdk.NewInt64Coin("denom"+shortDenom, amt)
	}
}

var (
	a = testCoin("A")
	b = testCoin("B")
	c = testCoin("C")
)

func TestComputeLienLocked(t *testing.T) {
	for _, tt := range []struct {
		name      string
		liened    sdk.Coins
		bonded    sdk.Coins
		unbonding sdk.Coins
		want      sdk.Coins
	}{
		{"empty", coins(), coins(), coins(), coins()},
		{"no_lien", coins(), coins(a(123)), coins(), coins()},
		{"no_bond", coins(a(234)), coins(), coins(), coins(a(234))},
		{"some_bond", coins(a(100)), coins(a(25)), coins(a(25)), coins(a(50))},
		{"lotsa_bond", coins(a(20)), coins(a(200)), coins(a(10)), coins()},
		{"mixed_denom", coins(a(100), b(20)), coins(a(70), c(15)), coins(b(17)), coins(a(30), b(3))},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := computeLienLocked(tt.liened, tt.bonded, tt.unbonding)
			if !tt.want.IsEqual(got) {
				t.Errorf("computeLienLocked() = %s, want %s", got, tt.want)
			}
		})
	}
}
