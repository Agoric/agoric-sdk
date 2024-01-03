package keeper

import (
	"time"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"

	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	vestexported "github.com/cosmos/cosmos-sdk/x/auth/vesting/exported"
	"github.com/gogo/protobuf/proto"
)

// omniAccount is the full expected interface of non-module accounts.
// In addition to the methods declared in authtypes.AccountI, additional
// expectations are enforced dynamically through casting and reflection:
//
//   - non-module accounts are expected to obey the GenesisAccount interface,
//     i.e. to have a Validate() method;
//
//   - UnpackInterfacesMessage is needed for unpacking accounts embedded
//     in an Any message;
//
//   - MarshalYAML() is used for String rendering;
//
//   - protobuf Messages are expected to implement a number of "XXX"-prefixed
//     methods not visible in the Message interface.
//
// Declaring the expected methods here allows them to implicitly fall through
// to an embedded omniAccount.
//
// Note that this interface will have to adapt to updated expectations in
// the cosmos-sdk or protobuf library.
type omniAccount interface {
	authtypes.GenesisAccount
	codectypes.UnpackInterfacesMessage
	MarshalYAML() (interface{}, error)
	XXX_DiscardUnknown()
	XXX_Marshal([]byte, bool) ([]byte, error)
	XXX_Merge(proto.Message)
	XXX_Size() int
	XXX_Unmarshal([]byte) error
}

// omniVestingAccount is an omniAccount plus vesting methods.
type omniVestingAccount interface {
	omniAccount
	vestexported.VestingAccount
}

// omniGrantAccount is an omniAccount plus GrantAccount methods.
type omniGrantAccount interface {
	omniAccount
	vestexported.GrantAccount
}

// omniClawbackAccount is an omniAccount plus Clawback methods.
type omniClawbackAccount interface {
	omniAccount
	vestexported.ClawbackVestingAccountI
}

// unlockedVestingAccount extends an omniAccount to be a vesting account
// by simulating an original vesting amount of zero. It inherets the marshal
// behavior of the wrapped account. It uses the lien structure to track
// delegation.
type unlockedVestingAccount struct {
	omniAccount
	lien *types.Lien
}

var _ omniVestingAccount = unlockedVestingAccount{}

// LockedCoins implements the vestexported.VestingAccount interface.
func (uva unlockedVestingAccount) LockedCoins(ctx sdk.Context) sdk.Coins {
	return sdk.NewCoins()
}

// TrackDelegation implements the vestexported.VestingAccount interface.
func (uva unlockedVestingAccount) TrackDelegation(blockTime time.Time, balance, amount sdk.Coins) {
	if !amount.IsAllLTE(balance) {
		panic("insufficient funds")
	}
	uva.lien.Delegated = uva.lien.Delegated.Add(amount...)
}

// TrackUndelegation implements the vestexported.VestingAccount interface.
func (uva unlockedVestingAccount) TrackUndelegation(amount sdk.Coins) {
	// max(delegated - amount, 0) == delegated - min(delegated, amount)
	uva.lien.Delegated = uva.lien.Delegated.Sub(uva.lien.Delegated.Min(amount))
}

// GetVestedCoins implements the vestexported.VestingAccount interface.
func (uva unlockedVestingAccount) GetVestedCoins(blockTime time.Time) sdk.Coins {
	return sdk.NewCoins()
}

// GetVestingCoins implements the vestexported.VestingAccount interface.
func (uva unlockedVestingAccount) GetVestingCoins(blockTime time.Time) sdk.Coins {
	return sdk.NewCoins()
}

// GetStartTime implements the vestexported.VestingAccount interface.
func (uva unlockedVestingAccount) GetStartTime() int64 {
	return 0
}

// GetEndTime implements the vestexported.VestingAccount interface.
func (uva unlockedVestingAccount) GetEndTime() int64 {
	return 0
}

// GetOriginalVesting implements the vestexported.VestingAccount interface.
func (uva unlockedVestingAccount) GetOriginalVesting() sdk.Coins {
	return sdk.NewCoins()
}

// GetDelegatedFree implements the vestexported.VestingAccount interface.
func (uva unlockedVestingAccount) GetDelegatedFree() sdk.Coins {
	return uva.lien.Delegated
}

// GetDelegatedVesting implements the vestexported.VestingAccount interface.
func (uva unlockedVestingAccount) GetDelegatedVesting() sdk.Coins {
	return sdk.NewCoins()
}

// XXX_MessageName implements the method used by the gogoproto extension
// for grpc-gateway compatibility.
func (uva unlockedVestingAccount) XXX_MessageName() string {
	return proto.MessageName(uva.omniAccount)
}

// fakeGrantAccount extends an omniVestingAccount to be a GrantAccount.
type fakeGrantAccount struct {
	omniVestingAccount
}

var _ omniGrantAccount = fakeGrantAccount{}

// AddGrant implements the vestexported.GrantAccount interface.
func (fga fakeGrantAccount) AddGrant(ctx sdk.Context, grantAction vestexported.AddGrantAction) error {
	return grantAction.AddToAccount(ctx, fga.omniVestingAccount) // XXX or just fail here
}

// fakeClawbackAccount extends an omniGrantAccount to be a clawback account.
type fakeClawbackAccount struct {
	omniGrantAccount
}

var _ omniClawbackAccount = fakeClawbackAccount{}

// GetUnlockedOnly implements the vestexported.ClawbackVestingAccountI interface.
func (fca fakeClawbackAccount) GetUnlockedOnly(blockTime time.Time) sdk.Coins {
	return fca.omniGrantAccount.GetVestedCoins(blockTime)
}

// GetVestedOnly implements the vestexported.ClawbackVestingAccountI interface.
func (fca fakeClawbackAccount) GetVestedOnly(blockTime time.Time) sdk.Coins {
	return fca.omniGrantAccount.GetOriginalVesting()
}

// Clawback implements the vestexported.ClawbackVestingAccountI interface.
func (fca fakeClawbackAccount) Clawback(ctx sdk.Context, action vestexported.ClawbackAction) error {
	return action.TakeFromAccount(ctx, fca.omniGrantAccount) // XXX or just fail here
}

// PostReward implements the vestexported.ClawbackVestingAccountI interface.
func (fca fakeClawbackAccount) PostReward(ctx sdk.Context, reward sdk.Coins, action vestexported.RewardAction) error {
	// perform no action here, but lienAccount can divert lien
	return nil
}

// ReturnGrants implements the vestexported.ClawbackVestingAccountI interface.
func (fca fakeClawbackAccount) ReturnGrants(ctx sdk.Context, action vestexported.ReturnGrantAction) error {
	return action.TakeGrants(ctx, fca.omniGrantAccount) // XXX or just fail here
}

// LienAccount wraps an omniClawbackAccount to implement lien encumbrance.
// The LockedCoins() method is the maximum of the coins locked for
// liens, and the coins locked in the underlying VestingAccount.
// It inherits the marshaling behavior of the wrapped account.
// In particular, the Lien account must be passed by pointer because of
// expectations from the proto library.
type LienAccount struct {
	omniClawbackAccount
	lienKeeper Keeper
	lien       types.Lien
}

var _ omniClawbackAccount = &LienAccount{}

// LockedCoins implements the method from the VestingAccount interface.
// It takes the maximum of the coins locked for liens and the coins
// locked in the wrapped VestingAccount, but limited to the current
// account balance.
func (la *LienAccount) LockedCoins(ctx sdk.Context) sdk.Coins {
	wrappedLocked := la.omniClawbackAccount.LockedCoins(ctx)
	lienedLocked := la.LienedLockedCoins(ctx)
	encumbered := wrappedLocked.Max(lienedLocked)
	balance := la.lienKeeper.GetAllBalances(ctx, la.GetAddress())
	return balance.Min(encumbered)
}

// LienedLockedCoins returns the coins which are locked on the lien/vesting dimension,
// which is the raw unvested amount, plus the raw liened amount, less the net amount
// delegated.
func (la *LienAccount) LienedLockedCoins(ctx sdk.Context) sdk.Coins {
	delegated := la.GetDelegatedFree().Add(la.GetDelegatedVesting()...)
	liened := la.lien.Coins
	acc := la.omniClawbackAccount.(authtypes.AccountI)
	if clawback, ok := acc.(vestexported.ClawbackVestingAccountI); ok {
		liened = liened.Add(clawback.GetOriginalVesting().Sub(clawback.GetVestedOnly(ctx.BlockTime()))...)
	}
	// Since coins can't go negative, even transiently, use the
	// identity A + B = max(A, B) + min(A, B)
	//    max(0, A - B) = max(B, A) - B = A - min(A, B)
	return liened.Sub(liened.Min(delegated))
}

// XXX_MessageName provides the message name for JSON serialization.
// See proto.MessageName().
func (la *LienAccount) XXX_MessageName() string {
	// Use the embedded account's message name for JSON serialization.
	return proto.MessageName(la.omniClawbackAccount)
}

// NewAccountWrapper returns an AccountWrapper which wraps any account
// to be a LienAccount associated with the given Keeper, then unwraps
// any layers that the Wrap added.
func NewAccountWrapper(lk Keeper) types.AccountWrapper {
	return types.AccountWrapper{
		Wrap: func(ctx sdk.Context, acc authtypes.AccountI) authtypes.AccountI {
			if acc == nil {
				return nil
			}
			omni, ok := acc.(omniAccount)
			if !ok {
				// don't wrap non-omni accounts, e.g. module accounts
				return acc
			}
			addr := acc.GetAddress()
			lien := lk.GetLien(ctx, addr)
			if lien.Coins.IsZero() {
				// don't wrap unless there is a lien
				return acc
			}
			lienAcc := LienAccount{
				lienKeeper: lk,
				lien:       lien,
			}
			vestingAcc, ok := omni.(omniVestingAccount)
			if !ok {
				// Make non-vesting accounts appear to be vesting
				// (need to give a pointer to the Lien - this is why the LienAccount
				// holding it is created first).
				vestingAcc = unlockedVestingAccount{omniAccount: omni, lien: &lienAcc.lien}
			}
			grantAcc, ok := vestingAcc.(omniGrantAccount)
			if !ok {
				// Make other vesting accounts appear to be GrantAccounts.
				grantAcc = fakeGrantAccount{omniVestingAccount: vestingAcc}
			}
			clawbackAcc, ok := grantAcc.(omniClawbackAccount)
			if !ok {
				// Make GrantAccounts appear to be ClawbackAccounts.
				clawbackAcc = fakeClawbackAccount{omniGrantAccount: grantAcc}
			}
			lienAcc.omniClawbackAccount = clawbackAcc
			return &lienAcc
		},
		Unwrap: func(ctx sdk.Context, acc authtypes.AccountI) authtypes.AccountI {
			if la, ok := acc.(*LienAccount); ok {
				lk.SetLien(ctx, la.GetAddress(), la.lien)
				acc = la.omniClawbackAccount
			}
			if fca, ok := acc.(fakeClawbackAccount); ok {
				acc = fca.omniGrantAccount
			}
			if fga, ok := acc.(fakeGrantAccount); ok {
				acc = fga.omniVestingAccount
			}
			if uva, ok := acc.(unlockedVestingAccount); ok {
				acc = uva.omniAccount
			}
			return acc
		},
	}
}
