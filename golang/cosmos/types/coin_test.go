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

func TestCoinsEq(t *testing.T) {
	if !CoinsEq(ZeroCoins, ZeroCoins) {
		t.Errorf("reflexivity failed for ZeroCoins")
	}
	c0 := coins(a(1))
	if !CoinsEq(c0, c0) {
		t.Errorf("reflexivity failed for %v", c0)
	}
	if CoinsEq(ZeroCoins, c0) {
		t.Errorf("disequality with zero failed for %v", c0)
	}
	c1 := coins(a(1), b(2))
	if !CoinsEq(c1, c1) {
		t.Errorf("reflexivity failed for %v", c1)
	}
	if CoinsEq(ZeroCoins, c1) {
		t.Errorf("disequality with zero failed for %v", c1)
	}
	if CoinsEq(c0, c1) {
		t.Errorf("disequality failed between %v and %v", c0, c1)
	}
}

func TestCoinsLTE(t *testing.T) {
	c0 := coins(a(1))
	c1 := coins(a(2))
	c2 := coins(a(1), b(1))
	for _, tt := range []struct {
		name string
		a    sdk.Coins
		b    sdk.Coins
		want bool
	}{
		{"zero-self", ZeroCoins, ZeroCoins, true},
		{"zero-nz", ZeroCoins, c0, true},
		{"nz-zero", c0, ZeroCoins, false},
		{"nz-self", c0, c0, true},
		{"more", c0, c1, true},
		{"less", c1, c0, false},
		{"add-denom", c0, c2, true},
		{"sub-denom", c2, c0, false},
		{"unrelated-1", c1, c2, false},
		{"unrelated-2", c2, c1, false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := CoinsLTE(tt.a, tt.b)
			if got != tt.want {
				t.Errorf("CoinsLTE() got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCoinsMax(t *testing.T) {
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
			got := CoinsMax(tt.a, tt.b)
			if !CoinsEq(got, tt.want) {
				t.Errorf("maxCoins() = %s, want %s", got, tt.want)
			}
		})
	}
}

func TestCoinsMin(t *testing.T) {
	for _, tt := range []struct {
		name string
		a    sdk.Coins
		b    sdk.Coins
		want sdk.Coins
	}{
		{"empty-empty", coins(), coins(), coins()},
		{"a-empty", coins(), coins(b(456)), coins()},
		{"b-empty", coins(a(123)), coins(), coins()},
		{"1-denom", coins(a(7)), coins(a(5)), coins(a(5))},
		{"disjoint", coins(a(3)), coins(b(2)), coins()},
		{
			name: "mixed",
			a:    coins(a(1), b(2), c(3), e(3)),
			b:    coins(b(4), c(1), d(7)),
			want: coins(b(2), c(1)),
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := CoinsMin(tt.a, tt.b)
			if !CoinsEq(got, tt.want) {
				t.Errorf("minCoins() = %s, want %s", got, tt.want)
			}
		})
	}
}

var propertyCoins = []sdk.Coins{
	ZeroCoins,
	coins(a(1)), coins(a(2)),
	coins(b(2)), coins(b(6)),
	coins(c(4)), coins(c(16)),
	coins(d(1)), coins(d(3)), coins(d(5)),
	coins(a(1), c(1), e(1)),
	coins(a(3), b(2), e(1)),
	coins(a(7), b(3), c(8), d(4), e(3)),
}

func TestUnaryProperties(t *testing.T) {
	for _, tt := range []struct {
		name string
		f    func(sdk.Coins) bool
	}{
		{
			name: "eq-reflexive",
			f: func(c sdk.Coins) bool {
				return CoinsEq(c, c)
			},
		},
		{
			name: "lte-reflexive",
			f: func(c sdk.Coins) bool {
				return CoinsLTE(c, c)
			},
		},
		{
			name: "max-self",
			f: func(c sdk.Coins) bool {
				return CoinsEq(c, CoinsMax(c, c))
			},
		},
		{
			name: "min-self",
			f: func(c sdk.Coins) bool {
				return CoinsEq(c, CoinsMin(c, c))
			},
		},
		{
			name: "bottom",
			f: func(c sdk.Coins) bool {
				return CoinsLTE(ZeroCoins, c)
			},
		},
		{
			name: "max-zero",
			f: func(c sdk.Coins) bool {
				return CoinsEq(c, CoinsMax(c, ZeroCoins))
			},
		},
		{
			name: "min-zero",
			f: func(c sdk.Coins) bool {
				return CoinsEq(ZeroCoins, CoinsMin(c, ZeroCoins))
			},
		},
		{
			name: "max-idempotent",
			f: func(c sdk.Coins) bool {
				return CoinsEq(c, CoinsMax(c, c))
			},
		},
		{
			name: "min-idempotent",
			f: func(c sdk.Coins) bool {
				return CoinsEq(c, CoinsMin(c, c))
			},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			for _, c := range propertyCoins {
				if !tt.f(c) {
					t.Errorf("failed on %v", c)
				}
			}
		})
	}
}

func TestBinaryProperties(t *testing.T) {
	for _, tt := range []struct {
		name string
		f    func(c0, c1 sdk.Coins) bool
	}{
		{
			name: "eq-symmetry",
			f: func(c0, c1 sdk.Coins) bool {
				return CoinsEq(c0, c1) == CoinsEq(c1, c0)
			},
		},
		{
			name: "lte-antisymmetry",
			f: func(c0, c1 sdk.Coins) bool {
				return !CoinsLTE(c0, c1) || !CoinsLTE(c1, c0) || CoinsEq(c0, c1)
			},
		},
		{
			name: "lte-vs-max",
			f: func(c0, c1 sdk.Coins) bool {
				return CoinsLTE(c0, c1) == CoinsEq(c1, CoinsMax(c0, c1))
			},
		},
		{
			name: "lte-vs-min",
			f: func(c0, c1 sdk.Coins) bool {
				return CoinsLTE(c0, c1) == CoinsEq(c0, CoinsMin(c0, c1))
			},
		},
		{
			name: "absorb-max",
			f: func(c0, c1 sdk.Coins) bool {
				return CoinsEq(c0, CoinsMax(c0, CoinsMin(c0, c1)))
			},
		},
		{
			name: "absorb-min",
			f: func(c0, c1 sdk.Coins) bool {
				return CoinsEq(c0, CoinsMin(c0, CoinsMax(c0, c1)))
			},
		},
		{
			name: "max-symmetric",
			f: func(c0, c1 sdk.Coins) bool {
				return CoinsEq(CoinsMax(c0, c1), CoinsMax(c1, c0))
			},
		},
		{
			name: "min-symmetric",
			f: func(c0, c1 sdk.Coins) bool {
				return CoinsEq(CoinsMin(c0, c1), CoinsMin(c1, c0))
			},
		},
		{
			name: "add-lte",
			f: func(c0, c1 sdk.Coins) bool {
				return CoinsLTE(c0, c0.Add(c1...))
			},
		},
		{
			name: "add-sub",
			f: func(c0, c1 sdk.Coins) bool {
				return CoinsEq(c1, c0.Add(c1...).Sub(c0))
			},
		},
		{
			name: "add-max-min",
			f: func(c0, c1 sdk.Coins) bool {
				return CoinsEq(c0.Add(c1...), CoinsMax(c0, c1).Add(CoinsMin(c0, c1)...))
			},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			for _, c0 := range propertyCoins {
				for _, c1 := range propertyCoins {
					if !tt.f(c0, c1) {
						t.Errorf("failed on %v, %v", c0, c1)
					}
				}
			}
		})
	}
}

func TestTernaryProperties(t *testing.T) {
	for _, tt := range []struct {
		name string
		f    func(c0, c1, c2 sdk.Coins) bool
	}{
		{
			name: "eq-transitive",
			f: func(c0, c1, c2 sdk.Coins) bool {
				return !CoinsEq(c0, c1) || !CoinsEq(c1, c2) || CoinsEq(c0, c2)
			},
		},
		{
			name: "lte-transitive",
			f: func(c0, c1, c2 sdk.Coins) bool {
				return !CoinsLTE(c0, c1) || !CoinsLTE(c1, c2) || CoinsLTE(c0, c2)
			},
		},
		{
			name: "distribute-max",
			f: func(c0, c1, c2 sdk.Coins) bool {
				return CoinsEq(
					CoinsMax(c0, CoinsMin(c1, c2)),
					CoinsMin(CoinsMax(c0, c1), CoinsMax(c0, c2)))
			},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			for _, c0 := range propertyCoins {
				for _, c1 := range propertyCoins {
					for _, c2 := range propertyCoins {
						if !tt.f(c0, c1, c2) {
							t.Errorf("failed on %v, %v, %v", c0, c1, c2)
						}
					}
				}
			}
		})
	}
}
