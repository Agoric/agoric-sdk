package types

import (
	"strings"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// maxCoins returns coins with the maximum amount of each denomination
// from its arguments.
func MaxCoins(a, b sdk.Coins) sdk.Coins {
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

// MinCoins returns the minimum of each denomination.
// The input coins should be sorted.
func MinCoins(a, b sdk.Coins) sdk.Coins {
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
