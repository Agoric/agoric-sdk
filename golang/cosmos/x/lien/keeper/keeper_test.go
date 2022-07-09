package keeper

import (
	"math"
	"reflect"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/app/params"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"

	"github.com/cosmos/cosmos-sdk/crypto/codec"
	"github.com/cosmos/cosmos-sdk/crypto/keys/ed25519"
	"github.com/cosmos/cosmos-sdk/store"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authkeeper "github.com/cosmos/cosmos-sdk/x/auth/keeper"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	"github.com/cosmos/cosmos-sdk/x/auth/vesting"
	vestingtypes "github.com/cosmos/cosmos-sdk/x/auth/vesting/types"
	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	paramskeeper "github.com/cosmos/cosmos-sdk/x/params/keeper"
	paramstypes "github.com/cosmos/cosmos-sdk/x/params/types"
	stakingkeeper "github.com/cosmos/cosmos-sdk/x/staking/keeper"
	stakingtypes "github.com/cosmos/cosmos-sdk/x/staking/types"

	"github.com/tendermint/tendermint/crypto/secp256k1"
	"github.com/tendermint/tendermint/libs/log"
	tmproto "github.com/tendermint/tendermint/proto/tendermint/types"
	dbm "github.com/tendermint/tm-db"
)

var (
	lienStoreKey    = storetypes.NewKVStoreKey(types.StoreKey)
	authStoreKey    = storetypes.NewKVStoreKey(authtypes.StoreKey)
	bankStoreKey    = storetypes.NewKVStoreKey(banktypes.StoreKey)
	paramsStoreKey  = storetypes.NewKVStoreKey(paramstypes.StoreKey)
	paramsTKey      = storetypes.NewTransientStoreKey(paramstypes.TStoreKey)
	stakingStoreKey = storetypes.NewKVStoreKey(stakingtypes.StoreKey)
)

var (
	priv1      = secp256k1.GenPrivKey()
	priv2      = secp256k1.GenPrivKey()
	priv3      = secp256k1.GenPrivKey()
	addr1      = sdk.AccAddress(priv1.PubKey().Address())
	addr2      = sdk.AccAddress(priv2.PubKey().Address())
	addr3      = sdk.AccAddress(priv3.PubKey().Address())
	valPriv1   = ed25519.GenPrivKey()
	zeroCoins  = sdk.NewCoins()
	emptyState = types.AccountState{
		Total:     zeroCoins,
		Bonded:    zeroCoins,
		Unbonding: zeroCoins,
		Locked:    zeroCoins,
		Liened:    zeroCoins,
	}
)

var (
	minterAcc = authtypes.NewEmptyModuleAccount(authtypes.Minter, authtypes.Minter)
)

func ubld(n int64) sdk.Coins {
	return sdk.NewCoins(sdk.NewInt64Coin("ubld", n))
}

type testKit struct {
	ctx           sdk.Context
	accountKeeper authkeeper.AccountKeeper
	bankKeeper    bankkeeper.Keeper
	stakingKeeper stakingkeeper.Keeper
	lienKeeper    Keeper
}

func (tk testKit) expand() (sdk.Context, authkeeper.AccountKeeper, bankkeeper.Keeper, stakingkeeper.Keeper, Keeper) {
	return tk.ctx, tk.accountKeeper, tk.bankKeeper, tk.stakingKeeper, tk.lienKeeper
}

func makeTestKit() testKit {
	encodingConfig := params.MakeEncodingConfig()
	codec.RegisterInterfaces(encodingConfig.InterfaceRegistry)
	authtypes.RegisterInterfaces(encodingConfig.InterfaceRegistry)
	vestingtypes.RegisterInterfaces(encodingConfig.InterfaceRegistry)
	banktypes.RegisterInterfaces(encodingConfig.InterfaceRegistry)
	stakingtypes.RegisterInterfaces(encodingConfig.InterfaceRegistry)
	cdc := encodingConfig.Marshaler

	// params keeper
	pk := paramskeeper.NewKeeper(cdc, encodingConfig.Amino, paramsStoreKey, paramsTKey)
	authSpace := pk.Subspace(authtypes.ModuleName)
	bankSpace := pk.Subspace(banktypes.ModuleName)
	stakingSpace := pk.Subspace(stakingtypes.ModuleName)

	// auth keeper
	maccPerms := map[string][]string{
		stakingtypes.BondedPoolName:    {authtypes.Burner, authtypes.Staking},
		stakingtypes.NotBondedPoolName: {authtypes.Burner, authtypes.Staking},
		authtypes.Minter:               {authtypes.Minter},
	}
	innerAk := authkeeper.NewAccountKeeper(cdc, authStoreKey, authSpace, authtypes.ProtoBaseAccount, maccPerms)
	wak := types.NewWrappedAccountKeeper(innerAk)

	// bank keeper
	blockedAddrs := make(map[string]bool)
	blockedAddrs[authtypes.NewModuleAddress(stakingtypes.BondedPoolName).String()] = true
	blockedAddrs[authtypes.NewModuleAddress(stakingtypes.NotBondedPoolName).String()] = true
	bk := bankkeeper.NewBaseKeeper(cdc, bankStoreKey, wak, bankSpace, blockedAddrs)

	// staking keeper
	sk := stakingkeeper.NewKeeper(cdc, stakingStoreKey, wak, bk, stakingSpace)

	// lien keeper
	pushAction := func(sdk.Context, vm.Jsonable) error {
		return nil
	}
	keeper := NewKeeper(cdc, lienStoreKey, wak, bk, sk, pushAction)
	wak.SetWrapper(keeper.GetAccountWrapper())

	db := dbm.NewMemDB()
	ms := store.NewCommitMultiStore(db)
	ms.MountStoreWithDB(paramsTKey, sdk.StoreTypeTransient, nil)
	ms.MountStoreWithDB(paramsStoreKey, sdk.StoreTypeIAVL, db)
	ms.MountStoreWithDB(authStoreKey, sdk.StoreTypeIAVL, db)
	ms.MountStoreWithDB(bankStoreKey, sdk.StoreTypeIAVL, db)
	ms.MountStoreWithDB(stakingStoreKey, sdk.StoreTypeIAVL, db)
	ms.MountStoreWithDB(lienStoreKey, sdk.StoreTypeIAVL, db)
	err := ms.LoadLatestVersion()
	if err != nil {
		panic(err)
	}
	ctx := sdk.NewContext(ms, tmproto.Header{}, false, log.NewNopLogger())

	wak.SetParams(ctx, authtypes.DefaultParams())
	bk.SetParams(ctx, banktypes.DefaultParams())
	stakingParams := stakingtypes.DefaultParams()
	stakingParams.BondDenom = "ubld"
	sk.SetParams(ctx, stakingParams)
	wak.SetModuleAccount(ctx, minterAcc)

	return testKit{ctx, wak, bk, sk, keeper}
}

func (tk testKit) initAccount(t *testing.T, funder, addr sdk.AccAddress, state types.AccountState) {
	// Locked
	if !state.Locked.IsZero() {
		if err := tk.bankKeeper.MintCoins(tk.ctx, authtypes.Minter, state.Locked); err != nil {
			t.Fatalf("cannot mint coins: %v", err)
		}
		if err := tk.bankKeeper.SendCoinsFromModuleToAccount(tk.ctx, authtypes.Minter, funder, state.Locked); err != nil {
			t.Fatalf("cannot send coins: %v", err)
		}
		vestingMsgServer := vesting.NewMsgServerImpl(tk.accountKeeper, tk.bankKeeper, tk.stakingKeeper)
		_, err := vestingMsgServer.CreateVestingAccount(sdk.WrapSDKContext(tk.ctx), &vestingtypes.MsgCreateVestingAccount{
			FromAddress: funder.String(),
			ToAddress:   addr.String(),
			Amount:      state.Locked,
			EndTime:     math.MaxInt64,
			Delayed:     true,
		})
		if err != nil {
			t.Fatalf("cannot create vesting account: %v", err)
		}
	}

	// Total
	toMint := state.Total.Sub(state.Locked)
	if !toMint.IsZero() {
		err := tk.bankKeeper.MintCoins(tk.ctx, authtypes.Minter, toMint)
		if err != nil {
			t.Fatalf("cannot mint coins: %v", err)
		}
		err = tk.bankKeeper.SendCoinsFromModuleToAccount(tk.ctx, authtypes.Minter, addr, toMint)
		if err != nil {
			t.Fatalf("cannot send coins: %v", err)
		}
	}

	// Bonded
	bondDenom := tk.stakingKeeper.BondDenom(tk.ctx)
	initialStaking := state.Bonded.Add(state.Unbonding...).AmountOf(bondDenom)
	if !initialStaking.IsZero() {
		pubKey := valPriv1.PubKey()
		vaddr := sdk.ValAddress(pubKey.Address().Bytes())
		validator, err := stakingtypes.NewValidator(vaddr, pubKey, stakingtypes.Description{})
		if err != nil {
			t.Fatalf("cannot create validator: %v", err)
		}
		validator, _ = validator.AddTokensFromDel(sdk.NewInt(100))
		validator = stakingkeeper.TestingUpdateValidator(tk.stakingKeeper, tk.ctx, validator, true)

		shares, err := tk.stakingKeeper.Delegate(tk.ctx, addr, initialStaking, stakingtypes.Unbonded, validator, true)
		if err != nil {
			t.Fatalf("cannot delegate: %v", err)
		}

		// Unbonding
		unbondShares := shares.MulInt(state.Unbonding.AmountOf(bondDenom)).QuoInt(initialStaking)
		if !unbondShares.IsZero() {
			_, err = tk.stakingKeeper.Undelegate(tk.ctx, addr, vaddr, unbondShares)
			if err != nil {
				t.Fatalf("cannot undelegate: %v", err)
			}
		}
	}

	// Liened
	tk.lienKeeper.SetLien(tk.ctx, addr, types.Lien{Coins: state.Liened})
}

func TestGetSetLien(t *testing.T) {
	ctx, _, _, _, keeper := makeTestKit().expand()

	// Empty
	l1 := keeper.GetLien(ctx, addr1)
	if !l1.GetCoins().IsZero() {
		t.Errorf("empty lien has %v, want empty", l1)
	}

	// Initialize
	amt := ubld(123)
	lien := types.Lien{Coins: amt}
	keeper.SetLien(ctx, addr1, lien)
	l2 := keeper.GetLien(ctx, addr1)
	if !l2.Coins.IsEqual(amt) {
		t.Errorf("initial lien has %v, want %s", l2, amt)
	}

	// Delete
	keeper.SetLien(ctx, addr1, types.Lien{})
	l3 := keeper.GetLien(ctx, addr1)
	if !l3.Coins.IsZero() {
		t.Errorf("zeroed lien has %v, want empty", l3)
	}
}

func TestIterateLiens(t *testing.T) {
	ctx, _, _, _, keeper := makeTestKit().expand()

	var liens map[string]types.Lien
	cb := func(a sdk.AccAddress, l types.Lien) bool {
		liens[a.String()] = l
		return false
	}
	reset := func() {
		liens = make(map[string]types.Lien)
	}

	// Empty
	reset()
	keeper.IterateLiens(ctx, cb)
	if len(liens) > 0 {
		t.Errorf("empty lien store has %v", liens)
	}

	// One
	reset()
	amt1 := ubld(123)
	keeper.SetLien(ctx, addr1, types.Lien{Coins: amt1})
	keeper.IterateLiens(ctx, cb)
	wantLiens := map[string]types.Lien{
		addr1.String(): {Coins: amt1},
	}
	if !reflect.DeepEqual(liens, wantLiens) {
		t.Errorf("singleton lien store has liens %v, want %v", liens, wantLiens)
	}

	// Several (including zero)
	reset()
	amt2 := ubld(456)
	keeper.SetLien(ctx, addr2, types.Lien{Coins: amt2})
	keeper.SetLien(ctx, addr3, types.Lien{})
	keeper.IterateLiens(ctx, cb)
	wantLiens[addr2.String()] = types.Lien{Coins: amt2}
	if !reflect.DeepEqual(liens, wantLiens) {
		t.Errorf("multiple lien store has liens %v, want %v", liens, wantLiens)
	}

	// Early termination
	reset()
	keeper.IterateLiens(ctx, func(a sdk.AccAddress, l types.Lien) bool {
		liens[a.String()] = l
		return true
	})
	// map iteration is non-deterministic, so just check number of results
	if len(liens) != 1 {
		t.Errorf("early termination has liens %v, want just one", liens)
	}
}

func TestAccountState(t *testing.T) {
	ctx, _, bk, sk, keeper := makeTestKit().expand()

	// empty
	state := keeper.GetAccountState(ctx, addr1)
	wantState := types.AccountState{}
	if !state.IsEqual(wantState) {
		t.Errorf("GetAccountState() of empty got %v, want %v", state, wantState)
	}

	// lien only
	amt1 := ubld(123)
	keeper.SetLien(ctx, addr1, types.Lien{Coins: amt1})
	state = keeper.GetAccountState(ctx, addr1)
	wantState = types.AccountState{Liened: amt1}
	if !state.IsEqual(wantState) {
		t.Errorf("GetAccountState() of lien only got %v, want %v", state, wantState)
	}

	// total and lien
	amt2 := sdk.NewCoins(sdk.NewInt64Coin("ubld", 1000), sdk.NewInt64Coin("urun", 5000), sdk.NewInt64Coin("moola", 22))
	err := bk.MintCoins(ctx, authtypes.Minter, amt2)
	if err != nil {
		t.Fatalf("cannot mint coins: %v", err)
	}
	err = bk.SendCoinsFromModuleToAccount(ctx, authtypes.Minter, addr1, amt2)
	if err != nil {
		t.Fatalf("cannot send coins: %v", err)
	}
	state = keeper.GetAccountState(ctx, addr1)
	wantState = types.AccountState{
		Total:  amt2,
		Liened: amt1,
	}
	if !state.IsEqual(wantState) {
		t.Errorf("GetAccountState() ver 3 got %v, want %v", state, wantState)
	}

	// bonded
	pubKey := valPriv1.PubKey()
	vaddr := sdk.ValAddress(pubKey.Address().Bytes())
	validator, err := stakingtypes.NewValidator(vaddr, pubKey, stakingtypes.Description{})
	if err != nil {
		t.Fatalf("cannot create validator: %v", err)
	}
	validator, _ = validator.AddTokensFromDel(sdk.NewInt(100))
	validator = stakingkeeper.TestingUpdateValidator(sk, ctx, validator, true)

	shares, err := sk.Delegate(ctx, addr1, sdk.NewInt(10), stakingtypes.Unbonded, validator, true)
	if err != nil {
		t.Fatalf("cannot delegate: %v", err)
	}

	state = keeper.GetAccountState(ctx, addr1)
	wantState = types.AccountState{
		Total:  amt2,
		Bonded: ubld(10),
		Liened: amt1,
	}
	if !state.IsEqual(wantState) {
		t.Errorf("GetAccountState() ver 4 got %v, want %v", state, wantState)
	}

	// unbonding
	_, err = sk.Undelegate(ctx, addr1, vaddr, shares.QuoInt(sdk.NewInt(10)))
	if err != nil {
		t.Fatalf("cannot undelegate: %v", err)
	}

	state = keeper.GetAccountState(ctx, addr1)
	wantState = types.AccountState{
		Total:     amt2,
		Bonded:    ubld(9),
		Unbonding: ubld(1),
		Liened:    amt1,
	}
	if !state.IsEqual(wantState) {
		t.Errorf("GetAccountState() ver 5 got %v, want %v", state, wantState)
	}
}

func TestVesting(t *testing.T) {
	ctx, ak, bk, sk, keeper := makeTestKit().expand()

	amt := ubld(1000)
	err := bk.MintCoins(ctx, authtypes.Minter, amt)
	if err != nil {
		t.Fatalf("cannot mint coins: %v", err)
	}
	err = bk.SendCoinsFromModuleToAccount(ctx, authtypes.Minter, addr1, amt)
	if err != nil {
		t.Fatalf("cannot send coins: %v", err)
	}

	vestingMsgServer := vesting.NewMsgServerImpl(ak, bk, sk)
	_, err = vestingMsgServer.CreateVestingAccount(sdk.WrapSDKContext(ctx), &vestingtypes.MsgCreateVestingAccount{
		FromAddress: addr1.String(),
		ToAddress:   addr2.String(),
		Amount:      amt,
		EndTime:     math.MaxInt64,
		Delayed:     true,
	})
	if err != nil {
		t.Fatalf("cannot create vesting account: %v", err)
	}

	state := keeper.GetAccountState(ctx, addr2)
	wantState := types.AccountState{
		Total:  amt,
		Locked: amt,
	}
	if !state.IsEqual(wantState) {
		t.Errorf("GetAccountState(1) got %v, want %v", state, wantState)
	}

	err = bk.SendCoins(ctx, addr2, addr1, ubld(5))
	if err == nil {
		t.Fatalf("transferred coins out of fully locked account!")
	}

	amt2 := ubld(300)
	err = bk.MintCoins(ctx, authtypes.Minter, amt2)
	if err != nil {
		t.Fatalf("cannot mint more coins: %v", err)
	}
	err = bk.SendCoinsFromModuleToAccount(ctx, authtypes.Minter, addr2, amt2)
	if err != nil {
		t.Fatalf("cannot transfer to vesting account: %v", err)
	}
	state = keeper.GetAccountState(ctx, addr2)
	wantState = types.AccountState{
		Total:  ubld(1300),
		Locked: ubld(1000),
	}
	if !state.IsEqual(wantState) {
		t.Errorf("GetAccountState(2) got %v, want %v", state, wantState)
	}
	err = bk.SendCoins(ctx, addr2, addr2, ubld(5))
	if err != nil {
		t.Errorf("cannot transfer free coins(1): %v", err)
	}

	keeper.SetLien(ctx, addr2, types.Lien{Coins: ubld(1200)})
	err = bk.SendCoins(ctx, addr2, addr1, ubld(95))
	if err != nil {
		t.Errorf("cannot transfer free coins(2): %v", err)
	}
	err = bk.SendCoins(ctx, addr2, addr1, ubld(7))
	if err == nil {
		t.Errorf("transferred liened coins!")
	}

	keeper.SetLien(ctx, addr2, types.Lien{Coins: ubld(3000)}) // deep underwater
	err = bk.SendCoins(ctx, addr2, addr1, ubld(7))
	if err == nil {
		t.Errorf("transferred liened coins!")
	}
}

func TestChangeLien(t *testing.T) {
	for _, tt := range []struct {
		name     string
		state    types.AccountState
		newLien  int64
		wantFail bool
	}{
		{
			name:    "empty zero",
			state:   emptyState,
			newLien: 0,
		},
		{
			name:     "empty some",
			state:    emptyState,
			newLien:  123,
			wantFail: true,
		},
		{
			name: "same",
			state: types.AccountState{
				Total:     ubld(15),
				Bonded:    ubld(1),
				Unbonding: ubld(2),
				Locked:    ubld(4),
				Liened:    ubld(8),
			},
			newLien: 8,
		},
		{
			name: "reduce",
			state: types.AccountState{
				Total:     ubld(15),
				Bonded:    ubld(1),
				Unbonding: ubld(2),
				Locked:    ubld(4),
				Liened:    ubld(8),
			},
			newLien: 7,
		},
		{
			name: "insufficient bonded",
			state: types.AccountState{
				Total:     ubld(15),
				Bonded:    ubld(1),
				Unbonding: ubld(2),
				Locked:    ubld(4),
				Liened:    ubld(8),
			},
			newLien:  9,
			wantFail: true,
		},
		{
			name: "unbonding not good enough",
			state: types.AccountState{
				Total:     ubld(15),
				Bonded:    ubld(0),
				Unbonding: ubld(15),
				Locked:    ubld(0),
				Liened:    ubld(8),
			},
			newLien:  9,
			wantFail: true,
		},
		{
			name: "locked ok",
			state: types.AccountState{
				Total:     ubld(15),
				Bonded:    ubld(15),
				Unbonding: ubld(0),
				Locked:    ubld(15),
				Liened:    ubld(0),
			},
			newLien: 1,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			tk := makeTestKit()
			ctx, _, _, sk, lk := tk.expand()
			tk.initAccount(t, addr1, addr2, tt.state)
			gotState := lk.GetAccountState(ctx, addr2)
			if !gotState.IsEqual(tt.state) {
				t.Fatalf("account state want %+v, got %+v", tt.state, gotState)
			}
			bondDenom := sk.BondDenom(ctx)
			delta := tt.newLien - tt.state.Liened.AmountOf(bondDenom).Int64()
			gotInt, err := lk.ChangeLien(ctx, addr2, bondDenom, sdk.NewInt(delta))
			if err != nil {
				if !tt.wantFail {
					t.Errorf("Update lien failed: %v", err)
				}
			} else if tt.wantFail {
				t.Errorf("Update lien succeeded, but wanted failure")
			} else {
				if !gotInt.Equal(sdk.NewInt(tt.newLien)) {
					t.Errorf("want new lien balance %s, got %d", gotInt, tt.newLien)
				}
			}

		})
	}
}

func TestWrap(t *testing.T) {
	tk := makeTestKit()
	ctx, wak, _, _, keeper := tk.expand()
	outerAk := wak.(*types.WrappedAccountKeeper)
	innerAk := outerAk.AccountKeeper

	tk.initAccount(t, addr1, addr2, types.AccountState{Total: ubld(33)})
	acc := innerAk.GetAccount(ctx, addr2)
	err := acc.SetAccountNumber(8)
	if err != nil {
		t.Error(err.Error())
	}

	wrapper := NewAccountWrapper(keeper)
	wrapped := wrapper.Wrap(ctx, acc)
	if wrapped != acc {
		t.Fatalf("wrapper changed lien-less account from %v to %v", acc, wrapped)
	}

	tk.initAccount(t, addr1, addr3, types.AccountState{Total: ubld(10), Liened: ubld(8)})
	acc = innerAk.GetAccount(ctx, addr3)
	err = acc.SetAccountNumber(17)
	if err != nil {
		t.Error(err.Error())
	}

	wrapped = wrapper.Wrap(ctx, acc)
	lienAcc, ok := wrapped.(*LienAccount)
	if !ok {
		t.Fatalf("wrapper did not create a lien account: %+v", wrapped)
	}

	if lienAcc.lienKeeper.(keeperImpl).accountKeeper != wak {
		t.Errorf("wrong lien keeper %+v, want %+v", lienAcc.lienKeeper, keeper)
	}
	unwrapped := wrapper.Unwrap(ctx, lienAcc)
	baseAccount, ok := unwrapped.(*authtypes.BaseAccount)
	if !ok {
		t.Fatalf("unwrapper did not produce a base account: %+v", unwrapped)
	}
	if baseAccount.AccountNumber != 17 {
		t.Errorf("wrong account number %d, want 17", baseAccount.AccountNumber)
	}
	unwrap2 := wrapper.Unwrap(ctx, baseAccount)
	_, ok = unwrap2.(*authtypes.BaseAccount)
	if !ok {
		t.Errorf("unwrapping unwrapped account gives %+v, want base account", unwrap2)
	}
	if unwrap2.GetAccountNumber() != 17 {
		t.Errorf("doubly unwrapped account has wrong account number %d, want 17", unwrap2.GetAccountNumber())
	}
	wrapped2 := wrapper.Wrap(ctx, nil)
	if wrapped2 != nil {
		t.Errorf("wrapped nil is %v, want nil", wrapped2)
	}

	modAcc := authtypes.NewEmptyModuleAccount("modname")
	wrapped = wrapper.Wrap(ctx, modAcc)
	_, ok = wrapped.(*LienAccount)
	if ok {
		t.Fatalf("should not wrap module accounts")
	}
	modAcc2, ok := wrapped.(*authtypes.ModuleAccount)
	if !ok {
		t.Fatalf("wrapped module account should be a module account")
	}
	if !reflect.DeepEqual(modAcc, modAcc2) {
		t.Errorf("wrapped module account should not change")
	}
}
