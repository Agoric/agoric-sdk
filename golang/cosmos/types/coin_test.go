package types

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
	d = testCoin("D")
	e = testCoin("E")
)

func TestMaxCoins(t *testing.T) {
	for _, tt := range []struct {
		name string
		a    sdk.Coins
		b    sdk.Coins
		want sdk.Coins
	}{
		{"empty-empty", coins(), coins(), coins()},
		{"a-empty", coins(), coins(b(456)), coins(b(456))},
		{"b-empty", coins(a(123)), coins(), coins(a(123))},
		{"1-denom", coins(a(7)), coins(a(5)), coins(a(7))},
		{"disjoint", coins(a(3)), coins(b(2)), coins(a(3), b(2))},
		{
			name: "mixed",
			a:    coins(a(1), b(2), c(3), e(3)),
			b:    coins(b(4), c(1), d(7)),
			want: coins(a(1), b(4), c(3), d(7), e(3)),
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := MaxCoins(tt.a, tt.b)
			if !tt.want.IsEqual(got) {
				t.Errorf("maxCoins() = %s, want %s", got, tt.want)
			}
		})
	}
}
