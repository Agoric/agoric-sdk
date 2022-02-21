package keeper

import (
	"math"
	"reflect"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/app/params"
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
	priv1    = secp256k1.GenPrivKey()
	priv2    = secp256k1.GenPrivKey()
	priv3    = secp256k1.GenPrivKey()
	addr1    = sdk.AccAddress(priv1.PubKey().Address())
	addr2    = sdk.AccAddress(priv2.PubKey().Address())
	addr3    = sdk.AccAddress(priv3.PubKey().Address())
	valPriv1 = ed25519.GenPrivKey()
)

var (
	minterAcc = authtypes.NewEmptyModuleAccount(authtypes.Minter, authtypes.Minter)
)

func ubld(n int64) sdk.Coins {
	return sdk.NewCoins(sdk.NewInt64Coin("ubld", n))
}

func makeTestKit() (sdk.Context, authkeeper.AccountKeeper, bankkeeper.Keeper, stakingkeeper.Keeper, Keeper) {
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
	callToController := func(sdk.Context, string) (string, error) {
		return "", nil
	}
	keeper := NewKeeper(lienStoreKey, cdc, wak, bk, sk, callToController)
	wak.SetWrapper(keeper.GetAccountWrapper())

	db := dbm.NewMemDB()
	ms := store.NewCommitMultiStore(db)
	ms.MountStoreWithDB(paramsTKey, sdk.StoreTypeTransient, nil)
	ms.MountStoreWithDB(paramsStoreKey, sdk.StoreTypeIAVL, db)
	ms.MountStoreWithDB(authStoreKey, sdk.StoreTypeIAVL, db)
	ms.MountStoreWithDB(bankStoreKey, sdk.StoreTypeIAVL, db)
	ms.MountStoreWithDB(stakingStoreKey, sdk.StoreTypeIAVL, db)
	ms.MountStoreWithDB(lienStoreKey, sdk.StoreTypeIAVL, db)
	ms.LoadLatestVersion()
	ctx := sdk.NewContext(ms, tmproto.Header{}, false, log.NewNopLogger())

	wak.SetParams(ctx, authtypes.DefaultParams())
	bk.SetParams(ctx, banktypes.DefaultParams())
	stakingParams := stakingtypes.DefaultParams()
	stakingParams.BondDenom = "ubld"
	sk.SetParams(ctx, stakingParams)
	wak.SetModuleAccount(ctx, minterAcc)

	return ctx, wak, bk, sk, keeper
}

func TestGetSetLien(t *testing.T) {
	ctx, _, _, _, keeper := makeTestKit()

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
	ctx, _, _, _, keeper := makeTestKit()

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
	ctx, _, bk, sk, keeper := makeTestKit()

	// empty
	state := keeper.GetAccountState(ctx, addr1)
	wantState := AccountState{}
	if !state.IsEqual(wantState) {
		t.Errorf("GetAccountState() of empty got %v, want %v", state, wantState)
	}

	// lien only
	amt1 := ubld(123)
	keeper.SetLien(ctx, addr1, types.Lien{Coins: amt1})
	state = keeper.GetAccountState(ctx, addr1)
	wantState = AccountState{Liened: amt1}
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
	wantState = AccountState{
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
	wantState = AccountState{
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
	wantState = AccountState{
		Total:     amt2,
		Bonded:    ubld(9),
		Unbonding: ubld(1),
		Liened:    amt1,
	}
}

func TestVesting(t *testing.T) {
	ctx, ak, bk, sk, keeper := makeTestKit()

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
	wantState := AccountState{
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
	wantState = AccountState{
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
}
