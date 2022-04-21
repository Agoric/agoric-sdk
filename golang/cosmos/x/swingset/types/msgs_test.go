package types

import (
	"testing"

	"github.com/cosmos/cosmos-sdk/crypto/keys/secp256k1"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

var (
	key  = secp256k1.GenPrivKey()
	pub  = key.PubKey()
	addr = sdk.AccAddress(pub.Address())
)

func TestWalletAction(t *testing.T) {
	for _, tt := range []struct {
		name      string
		msg       *MsgWalletAction
		shouldErr bool
	}{
		{
			name:      "empty",
			msg:       &MsgWalletAction{},
			shouldErr: true,
		},
		{
			name: "normal",
			msg:  NewMsgWalletAction(addr, "null"),
		},
		{
			name:      "empty action",
			msg:       NewMsgWalletAction(addr, ""),
			shouldErr: true,
		},
		{
			name:      "bad json",
			msg:       NewMsgWalletAction(addr, "foo"),
			shouldErr: true,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.msg.ValidateBasic()
			if err != nil && !tt.shouldErr {
				t.Fatalf("unexpected validation error %s", err)
			}
			if err == nil && tt.shouldErr {
				t.Fatalf("wanted validation error")
			}
		})
	}
}

func TestWalletSpendAction(t *testing.T) {
	for _, tt := range []struct {
		name      string
		msg       *MsgWalletSpendAction
		shouldErr bool
	}{
		{
			name:      "empty",
			msg:       &MsgWalletSpendAction{},
			shouldErr: true,
		},
		{
			name: "normal",
			msg:  NewMsgWalletSpendAction(addr, "null"),
		},
		{
			name:      "empty action",
			msg:       NewMsgWalletSpendAction(addr, ""),
			shouldErr: true,
		},
		{
			name:      "bad json",
			msg:       NewMsgWalletSpendAction(addr, "foo"),
			shouldErr: true,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.msg.ValidateBasic()
			if err != nil && !tt.shouldErr {
				t.Fatalf("unexpected validation error %s", err)
			}
			if err == nil && tt.shouldErr {
				t.Fatalf("wanted validation error")
			}
		})
	}
}
