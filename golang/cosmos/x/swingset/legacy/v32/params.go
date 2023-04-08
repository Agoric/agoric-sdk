package v32

import (
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
)

// UpdateParams performs the parameter updates to migrate to version 2,
// returning the updated params or an error.
func UpdateParams(params types.Params) (types.Params, error) {
	newBpu, err := addStorageBeanCost(params.BeansPerUnit)
	if err != nil {
		return params, err
	}
	params.BeansPerUnit = newBpu
	return params, nil
}

// addStorageBeanCost adds the default beans per storage byte cost,
// if it's not in the list of bean costs already, returning the possibly-updated list.
// or an error if there's no default storage cost.
func addStorageBeanCost(bpu []types.StringBeans) ([]types.StringBeans, error) {
	for _, ob := range bpu {
		if ob.Key == types.BeansPerStorageByte {
			// success if there's already an entry
			return bpu, nil
		}
	}
	defaultParams := types.DefaultParams()
	for _, b := range defaultParams.BeansPerUnit {
		if b.Key == types.BeansPerStorageByte {
			return append(bpu, b), nil
		}
	}
	return bpu, fmt.Errorf("no beans per storage byte in default params %v", defaultParams)
}
