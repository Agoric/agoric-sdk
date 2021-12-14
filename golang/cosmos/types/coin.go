package types

import (
	"strings"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// The native methods on sdk.Coins have surprising semantics.
// For instance, {2A,3B}.IsEqual({5X}) and {2A,3B}.IsEqual({5X,6Y,7Z})
// both return false, bug {2A,3B}.IsEqual({5X,6Y}) panics. The comparison
// operations IsAll{GT,GTE,LT,LTE}() and IsAny*() operate in the opposite
// sense of what many developers might expect, and restrict the range of
// compared denominations. Some operations require additional properties
// on Coins, e.g. sorted, nonnegative, but other methods, such as SafeSub(),
// can return values which don't have these properties. Additionally,
// developers can bypass the Coins constructor and instantiate values
// directly.
//
// This file provides some utilities for more predictable operations
// on Coins, and rules for safe use together with the Coins API.
//
// We'll only use Coins which pass the IsValid() check: i.e. all denoms
// are valid and all quantities are nonnegative, and in the representation
// the denoms are in ascending order without repetition and all zero
// quantities are omitted. Absent denoms are implicitly zero.
//
// Coins are given a partial order where c1 <= c2 if and oly if
// for all denominations d, c1[d] <= c2[d]. This partial order gives rise
// to a lattice structure where the join (least upper bound) is the
// per-denom max and the meet (greatest lower bound) is the per-denom min.
// The empty Coins value is the least element. It is safe to compute
// c1.Sub(c2) precisely when c2 <= c1.
//
// This gives the following properties for all coins A, B (where <= is
// CoinsLTE and == is CoinsEq):
//
// ZeroCoins <= A
// CoinsMin(ZeroCoins, A) == ZeroCoins
// CoinsMax(ZeroCoins, A) == A
// CoinsMax(A, CoinsMin(A, B)) == A
// CoinsMin(A, CoinsMax(A, B)) == A
// A <= B if and only if A == CoinsMin(A, B) and B == CoinsMax(A, B)
// CoinsMax(A, CoinsMin(B, C)) == CoinsMin(CoinsMax(A, B), CoinsMax(A, C))
// CoinsMin(A, CoinsMax(B, C)) == CoinsMax(CoinsMin(A, B), CoinsMin(A, C))
// CoinsMax and CoinsMin are symmetric and associative
// A <= A + B
// (A + B) - A == B
//
// The rules for safe use of Coins are:
// - Always construct Coins values with sdk.NewCoins, not sdk.Coins{...}.
// - Never use c from c, ok := coins1.SafeSub(coins2) when ok is false.
// - Only compute coins1.Sub(coins2) in a context where coins2 <= coins1.
// - Do not use IsEqual() - use CoinsEq() instead.
// - Do not use IsAll*() or IsAny*() (GT,GTE,LT,LTE) - use CoinsLTE() instead.
// - IsAnyNegative() and IsAnyNil() are unnecessary and confusing.
// - ParseCoinsNormalized does not do the validation that it promises -
//   you must call Validate() on its return value.
// - Do not access the slice representation directly.
// - All other methods, plus the methods in this file, are safe.

var (
	// ZeroCoins is the empty coins value. Do not assign to this var.
	ZeroCoins = sdk.NewCoins()
)

// CoinsEq returns true if a and b have the same quantiies in the same denominations, otherwise false.
// The input coins should be sorted.
// It differs from (sdk.Coins).IsEqual() in that the latter might panic if there is a mismatch in denominations.
// It is an equivalence relation - for all coins A, B, and C:
// - reflexivity: CoinsEq(A, A) == true
// - symmetry: CoinsEq(A, B) == CoinsEq(B, A)
// - transitivity: CoinsEq(A, B) && CoinsEq(B, C) implies CoinsEq(A, C)
func CoinsEq(a, b sdk.Coins) bool {
	if len(a) != len(b) {
		return false
	}
	for i := 0; i < len(a); i++ {
		if a[i].Denom != b[i].Denom {
			return false
		}
		if !a[i].Amount.Equal(b[i].Amount) {
			return false
		}
	}
	return true
}

// CoinsLTE returns true if b contains as much or more of each denomination in a, otherwise false.
// The input coins should be sorted. This gives a partial order, so for all coins A, B, and C:
// - reflexivity:  CoinsLTE(A, A) == true
// - antisymmetry: CoinsLTE(A, B) && CoinsLTE(B, A) implies CoinsEq(A, B)
// - transitivity: CoinsLTE(A, B) && CoinsLTE(B, C) implies CoinsLTE(A, C)
// Note that CoinsLTE(A, B) == false does not imply that CoinsLTE(B, A) == true.
// CoinsLTE(A, B) should be the same as CoinsEq(A, CoinsMin(A, B)) and CoinsEq(B, CoinsMax(A, B)).
func CoinsLTE(a, b sdk.Coins) bool {
	// TODO: implement with more efficient double-iteration
	for _, coin := range a {
		if !coin.Amount.LTE(b.AmountOf(coin.Denom)) {
			return false
		}
	}
	return true
}

// CoinsMax returns Coins with the max amount of each denomination of a and b.
// from its arguments.
func CoinsMax(a, b sdk.Coins) sdk.Coins {
	max := make([]sdk.Coin, 0)
	indexA, indexB := 0, 0
	for indexA < len(a) && indexB < len(b) {
		coinA, coinB := a[indexA], b[indexB]
		switch cmp := strings.Compare(coinA.Denom, coinB.Denom); {
		case cmp < 0: // A < B
			max = append(max, coinA)
			indexA++
		case cmp == 0: // A == B
			maxCoin := coinA
			if coinB.IsGTE(maxCoin) {
				maxCoin = coinB
			}
			if !maxCoin.IsZero() {
				max = append(max, maxCoin)
			}
			indexA++
			indexB++
		case cmp > 0: // A > B
			max = append(max, coinB)
			indexB++
		}
	}
	// Any leftovers are by definition the maximum
	for ; indexA < len(a); indexA++ {
		max = append(max, a[indexA])
	}
	for ; indexB < len(b); indexB++ {
		max = append(max, b[indexB])
	}
	// At most one of the previous two loops has run,
	// so output should remain sorted.
	return sdk.NewCoins(max...)
}

// CoinsMin returns the minimum of each denomination.
// The input coins should be sorted.
func CoinsMin(a, b sdk.Coins) sdk.Coins {
	min := make([]sdk.Coin, 0)
	for indexA, indexB := 0, 0; indexA < len(a) && indexB < len(b); {
		coinA, coinB := a[indexA], b[indexB]
		switch strings.Compare(coinA.Denom, coinB.Denom) {
		case -1: // A < B
			indexA++
		case 0: // A == B
			minCoin := coinA
			if coinB.IsLT(minCoin) {
				minCoin = coinB
			}
			if !minCoin.IsZero() {
				min = append(min, minCoin)
			}
			indexA++
			indexB++
		case 1: // A > B
			indexB++
		}
	}
	return sdk.NewCoins(min...)
}
