package keeper

import (
	"encoding/json"
	"fmt"
	"math"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
	vestexported "github.com/cosmos/cosmos-sdk/x/auth/vesting/exported"
)

// The lien API pays lip service to the idea that staking is done with
// arbitrary sdk.Coins, but the UnboindingDelegation contains only a bare
// sdk.Int, therefore the staking token must be a single implicit denom.
const stakingToken = "ubld"

type Keeper struct {
	accountKeeper    *types.WrappedAccountKeeper
	bankKeeper       types.BankKeeper
	stakingKeeper    types.StakingKeeper
	callToController func(ctx sdk.Context, str string) (string, error)
}

func NewKeeper(ak *types.WrappedAccountKeeper, bk types.BankKeeper, sk types.StakingKeeper,
	callToController func(ctx sdk.Context, str string) (string, error)) Keeper {
	return Keeper{
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
	Unbonding sdk.Coins
	Locked    sdk.Coins
}

type getLiened struct {
	Type        string `json:"type"` // LIEN_GET_LIENED_AMOUNT
	Address     string `json:"address"`
	CurrentTime string `json:"currentTime"`
	Denom       string `json:"denom"`
}

func (lk Keeper) GetLien(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins {
	req := getLiened{
		Type:        "LIEN_GET_LIENED_AMOUNT",
		Address:     addr.String(),
		CurrentTime: ctx.BlockTime().String(), // XXX use right format
		Denom:       stakingToken,
	}
	bz, err := json.Marshal(&req)
	if err != nil {
		panic(err)
	}
	reply, err := lk.callToController(ctx, string(bz))
	if err != nil {
		panic(err)
	}
	amt := sdk.NewInt(0)
	err = amt.UnmarshalJSON([]byte(reply))
	if err != nil {
		panic(fmt.Sprintf(`Can't decode "%s": %v`, reply, err))
	}
	return sdk.NewCoins(sdk.NewCoin(stakingToken, amt))
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

var _ vm.PortHandler = &Keeper{}

type portMessage struct {
	Type    string `json:"type"`
	Address string `json:"address"`
	Denom   string `json:"denom"`
}

type msgAccountState struct {
	CurrentTime string `json:"currentTime"`
	Total       string `json:"total"`
	Bonded      string `json:"bonded"`
	Unbonding   string `json:"unbonding"`
	Locked      string `json:"locked"`
}

func (lk Keeper) Receive(ctx *vm.ControllerContext, str string) (string, error) {
	var msg portMessage
	err := json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return "", err
	}
	switch msg.Type {
	case "LIEN_GET_ACCOUNT_STATE":
		addr, err := sdk.AccAddressFromBech32(msg.Address)
		if err != nil {
			return "", fmt.Errorf("cannot converts %s to address: %w", msg.Address, err)
		}
		if msg.Denom != stakingToken {
			return "", fmt.Errorf("bad staking token %s", msg.Denom)
		}
		now := ctx.Context.BlockTime()
		as := lk.GetAccountState(ctx.Context, addr)
		reply := msgAccountState{
			CurrentTime: now.String(),
			Total:       as.Total.AmountOf(msg.Denom).String(),
			Bonded:      as.Bonded.AmountOf(msg.Denom).String(),
			Unbonding:   as.Unbonding.AmountOf(msg.Denom).String(),
			Locked:      as.Locked.AmountOf(msg.Denom).String(),
		}
		bz, err := json.Marshal(&reply)
		if err != nil {
			return "", fmt.Errorf("cannot marshal %v: %s", reply, err)
		}
		return string(bz), nil

	default:
		return "", fmt.Errorf("unrecognized type %s", msg.Type)
	}
}
