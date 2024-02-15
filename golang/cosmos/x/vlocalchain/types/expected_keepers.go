package types

import (
	"context"

	sdk "github.com/cosmos/cosmos-sdk/types"
	transfer "github.com/cosmos/ibc-go/v6/modules/apps/transfer/types"
)

// TransferKeeper defines the expected IBC transfer keeper
type TransferKeeper interface {
	Transfer(goCtx context.Context, msg *transfer.MsgTransfer) (*transfer.MsgTransferResponse, error)
}

// BankKeeper defines the expected bank keeper
type BankKeeper interface {
	GetAllBalances(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins
	SendCoins(ctx sdk.Context, fromAddr sdk.AccAddress, toAddr sdk.AccAddress, amt sdk.Coins) error
}
