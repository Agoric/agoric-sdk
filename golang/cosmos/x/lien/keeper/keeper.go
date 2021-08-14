package keeper

import (
	"math"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"

	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	vestexported "github.com/cosmos/cosmos-sdk/x/auth/vesting/exported"
)

// The lien API pays lip service to the idea that staking is done with
// arbitrary sdk.Coins, but the UnboindingDelegation contains only a bare
// sdk.Int, therefore the staking token must be a single implicit denom.
const stakingToken = "ubld"

type Keeper struct {
	key sdk.StoreKey
	cdc codec.Codec

	accountKeeper *types.WrappedAccountKeeper
	bankKeeper    types.BankKeeper
	stakingKeeper types.StakingKeeper

	callToController func(ctx sdk.Context, str string) (string, error)
}

func NewKeeper(key sdk.StoreKey, cdc codec.Codec, ak *types.WrappedAccountKeeper, bk types.BankKeeper, sk types.StakingKeeper,
	callToController func(ctx sdk.Context, str string) (string, error)) Keeper {
	return Keeper{
		key:              key,
		cdc:              cdc,
		accountKeeper:    ak,
		bankKeeper:       bk,
		stakingKeeper:    sk,
		callToController: callToController,
	}
}

func (lk Keeper) GetAccountWrapper() types.AccountWrapper {
	return NewAccountWrapper(lk)
}

type AccountState struct {
	Total     sdk.Coins `json:"total"`
	Bonded    sdk.Coins `json:"bonded"`
	Unbonding sdk.Coins `json:"unbonding"`
	Locked    sdk.Coins `json:"locked"`
}

func (lk Keeper) GetAccountLien(ctx sdk.Context, addr sdk.AccAddress) types.AccountLien {
	store := ctx.KVStore(lk.key)
	bz := store.Get(types.LienByAddressKey(addr))
	if bz == nil {
		return types.AccountLien{Address: addr.String()} // XXX bech32 convert?
	}
	return lk.DecodeLien(bz)
}

func (lk Keeper) SetAccountLien(ctx sdk.Context, lien types.AccountLien) {
	store := ctx.KVStore(lk.key)
	bz := lk.MarshalAccount(lien)
	addr, err := sdk.AccAddressFromBech32(lien.Address)
	if err != nil {
		panic(err)
	}
	store.Set(types.LienByAddressKey(addr), bz)
}

func (lk Keeper) MarshalAccount(lien types.AccountLien) []byte {
	return lk.cdc.MustMarshal(&lien)
}

func (lk Keeper) DecodeLien(bz []byte) types.AccountLien {
	var lien types.AccountLien
	lk.cdc.MustUnmarshal(bz, &lien)
	return lien
}

func (lk Keeper) IterateAccountLiens(ctx sdk.Context, cb func(types.AccountLien) bool) {
	store := ctx.KVStore(lk.key)
	iterator := store.Iterator(nil, nil)
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		lien := lk.DecodeLien(iterator.Value())
		if cb(lien) {
			break
		}
	}
}

func (lk Keeper) GetAccountState(ctx sdk.Context, addr sdk.AccAddress) AccountState {
	bonded := lk.getBonded(ctx, addr)
	unbonding := lk.getUnbonding(ctx, addr)
	locked := lk.getLocked(ctx, addr)
	total := lk.bankKeeper.GetAllBalances(ctx, addr)
	total.Add(bonded...)
	total.Add(unbonding...)
	return AccountState{
		Total:     total,
		Bonded:    bonded,
		Unbonding: unbonding,
		Locked:    locked,
	}
}

func (lk Keeper) getBonded(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins {
	bonded := sdk.NewCoins()
	delegations := lk.stakingKeeper.GetDelegatorDelegations(ctx, addr, math.MaxUint16)
	for _, d := range delegations {
		validatorAddr, err := sdk.ValAddressFromBech32(d.ValidatorAddress)
		if err != nil {
			// XXX ???
			panic(err)
		}
		validator, found := lk.stakingKeeper.GetValidator(ctx, validatorAddr)
		if !found {
			// XXX ???
			panic("validator not found")
		}
		shares := d.GetShares()
		tokens := validator.TokensFromShares(shares)
		bonded.Add(sdk.NewCoin(stakingToken, tokens.RoundInt())) // XXX rounding?
	}
	return bonded
}

func (lk Keeper) getUnbonding(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins {
	unbonding := sdk.NewCoins()
	unbondings := lk.stakingKeeper.GetUnbondingDelegations(ctx, addr, math.MaxUint16)
	for _, u := range unbondings {
		amt := sdk.NewInt(0)
		for _, e := range u.Entries {
			amt.Add(e.Balance)
		}
		unbonding.Add(sdk.NewCoin(stakingToken, amt))
	}
	return unbonding
}

func (lk Keeper) getLocked(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins {
	account := lk.accountKeeper.GetAccount(ctx, addr)
	if account == nil {
		return sdk.NewCoins()
	}
	lienAccount, ok := account.(LienAccount)
	if ok {
		account = lienAccount.VestingAccount
	}
	vestingAccount, ok := account.(vestexported.VestingAccount)
	if !ok {
		return sdk.NewCoins()
	}
	return vestingAccount.GetVestingCoins(ctx.BlockTime())
}
