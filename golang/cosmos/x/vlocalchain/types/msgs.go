package types

import (
	"github.com/cosmos/cosmos-sdk/baseapp"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const RouterKey = ModuleName // this was defined in your key.go file

type MsgRouter interface {
	Handler(msg sdk.Msg) func(ctx sdk.Context, msg sdk.Msg) (*sdk.Result, error)
}

type GRPCQueryRouter interface {
	Route(path string) baseapp.GRPCQueryHandler
}
