package keeper

import (
	"strings"
	"time"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	vestexported "github.com/cosmos/cosmos-sdk/x/auth/vesting/exported"
)

func maxCoins(a, b sdk.Coins) sdk.Coins {
	max := make([]sdk.Coin, 0)
	for indexA, indexB := 0, 0; indexA < len(a) && indexB < len(b); {
		coinA, coinB := a[indexA], b[indexB]
		switch strings.Compare(coinA.Denom, coinB.Denom) {
		case -1: // A < B
			max = append(max, coinA)
			indexA++
		case 0: // A == B
			maxCoin := coinA
			if coinB.IsGTE(maxCoin) {
				maxCoin = coinB
			}
			if !maxCoin.IsZero() {
				max = append(max, maxCoin)
			}
			indexA++
			indexB++
		case 1: // A > B
			max = append(max, coinB)
			indexB++
		}
	}
	return sdk.NewCoins(max...)
}

var _ vestexported.VestingAccount = &LienAccount{}

type LienAccount struct {
	vestexported.VestingAccount
	lienKeeper Keeper
}

// LockedCoins implements the method from the VestingAccount interface.
// It takes the maximum of the coins locked for liens and the cons
// locked in the wrapped VestingAccount.
func (la *LienAccount) LockedCoins(ctx sdk.Context) sdk.Coins {
	wrappedLocked := la.VestingAccount.LockedCoins(ctx)
	lienedLocked := la.LienedLockedCoins(ctx)
	return maxCoins(wrappedLocked, lienedLocked)
}

func (la *LienAccount) LienedLockedCoins(ctx sdk.Context) sdk.Coins {
	state := la.lienKeeper.GetAccountState(ctx, la.GetAddress())
	lien := la.lienKeeper.GetAccountLien(ctx, la.GetAddress())
	return computeLienLocked(lien.GetLien(), state.Bonded, state.Unbonding)
}

func computeLienLocked(liened, bonded, unbonding sdk.Coins) sdk.Coins {
	// We're only interested in the lien-encumbered unbonded coins.
	// The bonded and unbonding coins are encumbered first, so we
	// compute the remainder.
	locked, _ := liened.SafeSub(bonded)
	locked, _ = locked.SafeSub(unbonding)
	return maxCoins(sdk.NewCoins(), locked)
}

func NewAccountWrapper(lk Keeper) types.AccountWrapper {
	return types.AccountWrapper{
		Wrap: func(acc authtypes.AccountI) authtypes.AccountI {
			if acc == nil {
				return nil
			}
			return &LienAccount{
				VestingAccount: makeVesting(acc),
				lienKeeper:     lk,
			}
		},
		Unwrap: func(acc authtypes.AccountI) authtypes.AccountI {
			if la, ok := acc.(*LienAccount); ok {
				acc = la.VestingAccount
			}
			if uva, ok := acc.(*unlockedVestingAccount); ok {
				acc = uva.AccountI
			}
			return acc
		},
	}
}

func makeVesting(acc authtypes.AccountI) vestexported.VestingAccount {
	if v, ok := acc.(vestexported.VestingAccount); ok {
		return v
	}
	return &unlockedVestingAccount{AccountI: acc}
}

// unlockedVestingAccount extends an ordinary account to be a vesting account
// by simulating an original vesting amount of zero. It will be still stored
// as the wrapped account.
type unlockedVestingAccount struct {
	authtypes.AccountI
}

var _ vestexported.VestingAccount = (*unlockedVestingAccount)(nil)

func (uva *unlockedVestingAccount) LockedCoins(ctx sdk.Context) sdk.Coins {
	return sdk.NewCoins()
}

func (uva *unlockedVestingAccount) TrackDelegation(blockTime time.Time, balance, amount sdk.Coins) {
}

func (uva *unlockedVestingAccount) TrackUndelegation(amount sdk.Coins) {
}

func (uva *unlockedVestingAccount) GetVestedCoins(blockTime time.Time) sdk.Coins {
	return sdk.NewCoins()
}

func (uva *unlockedVestingAccount) GetVestingCoins(blockTime time.Time) sdk.Coins {
	return sdk.NewCoins()
}

func (uva *unlockedVestingAccount) GetStartTime() int64 {
	return 0
}

func (uva *unlockedVestingAccount) GetEndTime() int64 {
	return 0
}

func (uva *unlockedVestingAccount) GetOriginalVesting() sdk.Coins {
	return sdk.NewCoins()
}

func (uva *unlockedVestingAccount) GetDelegatedFree() sdk.Coins {
	return sdk.NewCoins()
}

func (uva *unlockedVestingAccount) GetDelegatedVesting() sdk.Coins {
	return sdk.NewCoins()
}
