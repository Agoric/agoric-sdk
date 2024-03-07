package ante

import (
	"context"
	"reflect"
	"testing"

	"github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/tx"

	// "github.com/cosmos/cosmos-sdk/x/auth/ante"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	"github.com/gogo/protobuf/proto"
)

const (
	addr1 = "cosmos1uupflqrldlpkktssnzgp3r03ff6kz4u4kzd92pjgsfddye7grrlqt9rmmt"
)

var (
	c = sdk.NewCoins
)

func ubld(amt int64) sdk.Coin {
	return sdk.NewInt64Coin("ubld", amt)
}

func makeTestFeeTx(msgs ...proto.Message) *tx.Tx {
	wrappedMsgs := make([]*types.Any, len(msgs))
	for i, m := range msgs {
		any, err := types.NewAnyWithValue(m)
		if err != nil {
			panic(err)
		}
		wrappedMsgs[i] = any
	}
	return &tx.Tx{
		AuthInfo: &tx.AuthInfo{
			Fee: &tx.Fee{},
		},
		Body: &tx.TxBody{
			Messages: wrappedMsgs,
		},
	}
}

type mockFeegrantKeeper struct{}

var _ FeegrantKeeper = mockFeegrantKeeper{}

func (mfk mockFeegrantKeeper) UseGrantedFees(ctx sdk.Context, granter, grantee sdk.AccAddress, fee sdk.Coins, msgs []sdk.Msg) error {
	return nil
}

func TestDoubleFee(t *testing.T) {
	feeCollector := "fee collector"
	ak := mockAccountKeeper{}
	bk := newMockBankKeeper()
	fk := mockFeegrantKeeper{}
	handler := sdk.ChainAnteDecorators(
		// ante.NewDeductFeeDecorator(ak, bk, fk, nil),
		NewMempoolFeeDecorator(),
		NewDeductFeeDecorator(ak, bk, fk, feeCollector),
	)

	checkTx := false
	eventManager := sdk.NewEventManager()
	ctx := sdk.Context{}.WithContext(context.Background()).WithIsCheckTx(checkTx).WithEventManager(eventManager)
	tx := makeTestFeeTx(&banktypes.MsgSend{})
	fee := c(ubld(1000))
	tx.AuthInfo.Fee.Amount = fee
	tx.AuthInfo.Fee.GasLimit = 64000
	tx.AuthInfo.Fee.Payer = addr1

	simulate := false
	errMsg := ""

	bk.balances[addr1] = c(ubld(9000))

	newCtx, err := handler(ctx, tx, simulate)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(newCtx, ctx) {
		t.Errorf("want ctx %v, got %v", ctx, newCtx)
	}
	if err != nil {
		if errMsg == "" {
			t.Errorf("want no error, got %s", err.Error())
		} else if err.Error() != errMsg {
			t.Errorf("want error %s, got %s", errMsg, err.Error())
		}
	} else if errMsg != "" {
		t.Errorf("want error %s, got none", errMsg)
	}
	if !bk.balances[addr1].IsEqual(c(ubld(8000))) {
		t.Errorf("want sender balance %s, got %s", c(ubld(8000)), bk.balances[addr1])
	}
	if !bk.balances[feeCollector].IsEqual(fee) {
		t.Errorf("want fee collector balance %s, got %s", fee, bk.balances[feeCollector])
	}
}
