package testing

import (
	"fmt"

	keeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/keeper"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func GetQueueItems(ctx sdk.Context, vstorageKeeper keeper.Keeper, queuePath string) ([]string, error) {
	unlimitedCtx := ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	head, err := vstorageKeeper.GetIntValue(unlimitedCtx, queuePath+".head")
	if err != nil {
		return nil, err
	}
	tail, err := vstorageKeeper.GetIntValue(unlimitedCtx, queuePath+".tail")
	if err != nil {
		return nil, err
	}
	length := tail.Sub(head).Int64()
	values := make([]string, length)
	var i int64
	for i = 0; i < length; i++ {
		path := fmt.Sprintf("%s.%s", queuePath, head.Add(sdk.NewInt(i)).String())
		values[i] = vstorageKeeper.GetEntry(unlimitedCtx, path).StringValue()
	}
	return values, nil
}

func ResetQueue(ctx sdk.Context, vstorageKeeper keeper.Keeper, queuePath string) error {
	unlimitedCtx := ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
	vstorageKeeper.RemoveEntriesWithPrefix(unlimitedCtx, queuePath)
	return nil
}
