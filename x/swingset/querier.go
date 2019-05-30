package swingset

import (
	"encoding/json"
	"strings"

	"github.com/cosmos/cosmos-sdk/codec"

	sdk "github.com/cosmos/cosmos-sdk/types"
	abci "github.com/tendermint/tendermint/abci/types"
)

// query endpoints supported by the swingset Querier
const (
	QueryMailbox = "mailbox"
	QueryStorage = "storage"
	QueryKeys    = "keys"
)

// NewQuerier is the module level router for state queries
func NewQuerier(keeper Keeper) sdk.Querier {
	return func(ctx sdk.Context, path []string, req abci.RequestQuery) (res []byte, err sdk.Error) {
		switch path[0] {
		case QueryStorage:
			return queryStorage(ctx, strings.Join(path[1:], "/"), req, keeper)
		case QueryKeys:
			return queryKeys(ctx, strings.Join(path[1:], "/"), req, keeper)
		case QueryMailbox:
			return queryMailbox(ctx, path[1:], req, keeper)
		default:
			return nil, sdk.ErrUnknownRequest("unknown swingset query endpoint")
		}
	}
}

// nolint: unparam
func queryStorage(ctx sdk.Context, path string, req abci.RequestQuery, keeper Keeper) (res []byte, err sdk.Error) {
	storage := keeper.GetStorage(ctx, path)
	value := storage.Value

	if value == "" {
		return []byte{}, sdk.ErrUnknownRequest("could not get storage")
	}

	bz, err2 := codec.MarshalJSONIndent(keeper.cdc, QueryResStorage{value})
	if err2 != nil {
		panic("could not marshal result to JSON")
	}

	return bz, nil
}

// nolint: unparam
func queryKeys(ctx sdk.Context, path string, req abci.RequestQuery, keeper Keeper) (res []byte, err sdk.Error) {
	keys := keeper.GetKeys(ctx, path)
	klist := keys.Keys

	if klist == nil {
		return []byte{}, sdk.ErrUnknownRequest("could not get keys")
	}

	bz, err2 := codec.MarshalJSONIndent(keeper.cdc, QueryResKeys{klist})
	if err2 != nil {
		panic("could not marshal result to JSON")
	}

	return bz, nil
}

// nolint: unparam
func queryMailbox(ctx sdk.Context, path []string, req abci.RequestQuery, keeper Keeper) (res []byte, err sdk.Error) {
	peer := path[0]

	mailbox := keeper.GetMailbox(ctx, peer)
	value := mailbox.Value

	if value == "" {
		return []byte{}, sdk.ErrUnknownRequest("could not get peer mailbox")
	}

	bz, err2 := codec.MarshalJSONIndent(keeper.cdc, QueryResStorage{value})
	if err2 != nil {
		panic("could not marshal result to JSON")
	}

	return bz, nil
}

// Query Result Payload for a storage query
type QueryResStorage struct {
	Value string `json:"value"`
}

// implement fmt.Stringer
func (r QueryResStorage) String() string {
	return r.Value
}

// Query Result Payload for a keys query
type QueryResKeys struct {
	Keys []string `json:"keys"`
}

// implement fmt.Stringer
func (r QueryResKeys) String() string {
	bytes, err := json.Marshal(r.Keys)
	if err != nil {
		return ""
	}
	return string(bytes)
}
