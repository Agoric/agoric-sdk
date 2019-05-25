package swingset

import (
	"github.com/cosmos/cosmos-sdk/codec"

	sdk "github.com/cosmos/cosmos-sdk/types"
	abci "github.com/tendermint/tendermint/abci/types"
)

// query endpoints supported by the swingset Querier
const (
	QueryMailbox = "mailbox"
)

// NewQuerier is the module level router for state queries
func NewQuerier(keeper Keeper) sdk.Querier {
	return func(ctx sdk.Context, path []string, req abci.RequestQuery) (res []byte, err sdk.Error) {
		switch path[0] {
		case QueryMailbox:
			return queryMailbox(ctx, path[1:], req, keeper)
		default:
			return nil, sdk.ErrUnknownRequest("unknown swingset query endpoint")
		}
	}
}

// nolint: unparam
func queryMailbox(ctx sdk.Context, path []string, req abci.RequestQuery, keeper Keeper) (res []byte, err sdk.Error) {
	peer := path[0]

	mailbox := keeper.GetMailbox(ctx, peer)
	value := mailbox.Value

	if value == "" {
		return []byte{}, sdk.ErrUnknownRequest("could not get peer mailbox")
	}

	bz, err2 := codec.MarshalJSONIndent(keeper.cdc, QueryResMailbox{value})
	if err2 != nil {
		panic("could not marshal result to JSON")
	}

	return bz, nil
}

// Query Result Payload for a resolve query
type QueryResMailbox struct {
	Value string `json:"value"`
}

// implement fmt.Stringer
func (r QueryResMailbox) String() string {
	return r.Value
}
