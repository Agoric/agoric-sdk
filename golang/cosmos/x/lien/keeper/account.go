package keeper

import (
	"strings"
	"time"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"

	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	vestexported "github.com/cosmos/cosmos-sdk/x/auth/vesting/exported"
	"github.com/gogo/protobuf/proto"
)

// maxCoins returns coins with the maximum amount of each denomination
// from its arguments.
func maxCoins(a, b sdk.Coins) sdk.Coins {
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
	//	messageName string
}

var _ vestexported.VestingAccount = &LienAccount{}
var _ authtypes.GenesisAccount = &LienAccount{}

// LockedCoins implements the method from the VestingAccount interface.
// It takes the maximum of the coins locked for liens and the coins
// locked in the wrapped VestingAccount.
func (la *LienAccount) LockedCoins(ctx sdk.Context) sdk.Coins {
	wrappedLocked := la.omniVestingAccount.LockedCoins(ctx)
	lienedLocked := la.LienedLockedCoins(ctx)
	return maxCoins(wrappedLocked, lienedLocked)
}

// Returns the coins which are locked for lien encumbrance.
func (la *LienAccount) LienedLockedCoins(ctx sdk.Context) sdk.Coins {
	state := la.lienKeeper.GetAccountState(ctx, la.GetAddress())
	return computeLienLocked(state.Liened, state.Bonded, state.Unbonding)
}

// Returns the coins which are locked for lien encumbrance.
// The lien applies to bonded and unbonding coins before unbonded coins,
// so we return max(0, liened - (bonded + unbonding)).
func computeLienLocked(liened, bonded, unbonding sdk.Coins) sdk.Coins {
	// Since coins can't go negative, even transiently, we add then
	// subtract the subtrahend:
	//    max(0, A - B) = max(B, A) - B
	subtrahend := bonded.Add(unbonding...)
	return maxCoins(subtrahend, liened).Sub(subtrahend)
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
		Wrap: func(acc authtypes.AccountI) authtypes.AccountI {
			if acc == nil {
				return nil
			}
			if omni, ok := acc.(omniAccount); ok {
				return &LienAccount{
					omniVestingAccount: makeVesting(omni),
					lienKeeper:         lk,
				}
			}
			// don't wrap non-omni accounts, e.g. module accounts
			return acc
		},
		Unwrap: func(acc authtypes.AccountI) authtypes.AccountI {
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

// makeVesting returns a VestingAccount, wrapping a non-vesting argument
// in a trivial implementation if necessary.
func makeVesting(acc omniAccount) omniVestingAccount {
	if v, ok := acc.(omniVestingAccount); ok {
		return v
	}
	return unlockedVestingAccount{omniAccount: acc}
}

// unlockedVestingAccount extends an omniAccount to be a vesting account
// by simulating an original vesting amount of zero. It inherets the marshal
// behavior of the wrapped account.
type unlockedVestingAccount struct {
	omniAccount
}

var _ vestexported.VestingAccount = unlockedVestingAccount{}
var _ authtypes.GenesisAccount = unlockedVestingAccount{}

func (uva unlockedVestingAccount) LockedCoins(ctx sdk.Context) sdk.Coins {
	return sdk.NewCoins()
}

func (uva unlockedVestingAccount) TrackDelegation(blockTime time.Time, balance, amount sdk.Coins) {
}

func (uva unlockedVestingAccount) TrackUndelegation(amount sdk.Coins) {
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
	return sdk.NewCoins()
}

func (uva unlockedVestingAccount) GetDelegatedVesting() sdk.Coins {
	return sdk.NewCoins()
}

func (uva unlockedVestingAccount) XXX_MessageName() string {
	return proto.MessageName(uva.omniAccount)
}
