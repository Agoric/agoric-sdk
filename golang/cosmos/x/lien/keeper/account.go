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
//	- non-module accounts are expected to obey the GenesisAccount interface,
//	i.e. to have a Validate() method;
//
//	- UnpackInterfacesMessage is needed for unpacking accounts embedded
//	in an Any message;
//
//	- MarshalYAML() is used for String rendering;
//
//	- protobuf Messages are expected to implement a number of "XXX"-prefixed
//	methods not visible in the Message interface.
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

// LienAccount wraps an omniVestingAccount to implement lien encumbrance.
// The LockedCoins() method is the maximum of the coins locked for
// liens, and the coins locked in the underlying VestingAccount.
// It inherits the marshaling behavior of the wrapped account.
// In particular, the Lien account must be passed by pointer because of
// expectations from the proto library.
type LienAccount struct {
	omniVestingAccount
	lienKeeper Keeper
	lien       types.Lien
}

var _ vestexported.VestingAccount = &LienAccount{}
var _ authtypes.GenesisAccount = &LienAccount{}

// LockedCoins implements the method from the VestingAccount interface.
// It takes the maximum of the coins locked for liens and the coins
// locked in the wrapped VestingAccount.
func (la *LienAccount) LockedCoins(ctx sdk.Context) sdk.Coins {
	wrappedLocked := la.omniVestingAccount.LockedCoins(ctx)
	lienedLocked := la.LienedLockedCoins(ctx)
	return wrappedLocked.Max(lienedLocked)
}

// Returns the coins which are locked for lien encumbrance.
func (la *LienAccount) LienedLockedCoins(ctx sdk.Context) sdk.Coins {
	delegated := la.GetDelegatedFree().Add(la.GetDelegatedVesting()...)
	liened := la.lien.Coins
	// Since coins can't go negative, even transiently, use the
	// identity A + B = max(A, B) + min(A, B)
	//    max(0, A - B) = max(B, A) - B = A - min(A, B)
	return liened.Sub(liened.Min(delegated))
}

// XXX_MessageName provides the message name for JSON serialization.
// See proto.MessageName().
func (la *LienAccount) XXX_MessageName() string {
	// Use the embedded account's message name for JSON serialization.
	return proto.MessageName(la.omniVestingAccount)
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
				vestingAcc = unlockedVestingAccount{omniAccount: omni, lien: &lienAcc.lien}
			}
			lienAcc.omniVestingAccount = vestingAcc
			return &lienAcc
		},
		Unwrap: func(ctx sdk.Context, acc authtypes.AccountI) authtypes.AccountI {
			if la, ok := acc.(*LienAccount); ok {
				acc = la.omniVestingAccount
			}
			if uva, ok := acc.(unlockedVestingAccount); ok {
				acc = uva.omniAccount
			}
			return acc
		},
	}
}

// unlockedVestingAccount extends an omniAccount to be a vesting account
// by simulating an original vesting amount of zero. It inherets the marshal
// behavior of the wrapped account.
type unlockedVestingAccount struct {
	omniAccount
	lien *types.Lien
}

var _ vestexported.VestingAccount = unlockedVestingAccount{}
var _ authtypes.GenesisAccount = unlockedVestingAccount{}

func (uva unlockedVestingAccount) LockedCoins(ctx sdk.Context) sdk.Coins {
	return sdk.NewCoins()
}

func (uva unlockedVestingAccount) TrackDelegation(blockTime time.Time, balance, amount sdk.Coins) {
	if !amount.IsAllLTE(balance) {
		panic("insufficient funds")
	}
	uva.lien.Delegated = uva.lien.Delegated.Add(amount...)
}

func (uva unlockedVestingAccount) TrackUndelegation(amount sdk.Coins) {
	// max(delegated - amount, 0) == delegated - min(delegated, amount)
	uva.lien.Delegated = uva.lien.Delegated.Sub(uva.lien.Delegated.Min(amount))
}

func (uva unlockedVestingAccount) GetVestedCoins(blockTime time.Time) sdk.Coins {
	return sdk.NewCoins()
}

func (uva unlockedVestingAccount) GetVestingCoins(blockTime time.Time) sdk.Coins {
	return sdk.NewCoins()
}

func (uva unlockedVestingAccount) GetStartTime() int64 {
	return 0
}

func (uva unlockedVestingAccount) GetEndTime() int64 {
	return 0
}

func (uva unlockedVestingAccount) GetOriginalVesting() sdk.Coins {
	return sdk.NewCoins()
}

func (uva unlockedVestingAccount) GetDelegatedFree() sdk.Coins {
	return uva.lien.Delegated
}

func (uva unlockedVestingAccount) GetDelegatedVesting() sdk.Coins {
	return sdk.NewCoins()
}

func (uva unlockedVestingAccount) XXX_MessageName() string {
	return proto.MessageName(uva.omniAccount)
}
