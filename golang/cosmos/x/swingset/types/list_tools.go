package types

import (
	"github.com/cosmos/cosmos-sdk/codec"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

type ListTools struct {
	cdc       codec.Codec
	nodeStore storetypes.KVStore
}

type ListKey struct {
	keyBytes []byte
}

func (ListTools) Key(id uint64) ListKey {
	keyBytes := sdk.Uint64ToBigEndian(id)
	return ListKey{keyBytes: keyBytes}
}

func (lt ListTools) Fetch(key ListKey) *PendingInstallNode {
	var node PendingInstallNode
	if !lt.nodeStore.Has(key.keyBytes) {
		return nil
	}
	bz := lt.nodeStore.Get(key.keyBytes)
	lt.cdc.MustUnmarshal(bz, &node)
	return &node
}

func (lt ListTools) Store(key ListKey, node *PendingInstallNode) {
	bz := lt.cdc.MustMarshal(node)
	lt.nodeStore.Set(key.keyBytes, bz)
}

func (lt ListTools) Delete(key ListKey) {
	lt.nodeStore.Delete(key.keyBytes)
}

func (lt ListTools) Unlink(victim *PendingInstallNode, updateEnds func(first, last *uint64)) {
	if victim == nil {
		return
	}

	if updateEnds != nil && (victim.PriorId == 0 || victim.NextId == 0) {
		var firstp, lastp *uint64
		if victim.PriorId == 0 {
			// This is the first node in the list.
			first := victim.NextId
			firstp = &first
		}
		if victim.NextId == 0 {
			// This is the last node in the list.
			last := victim.PriorId
			lastp = &last
		}
		updateEnds(firstp, lastp)
	}

	updateNode := func(id uint64, mutate func(*PendingInstallNode)) {
		key := lt.Key(id)
		node := lt.Fetch(key)
		mutate(node)
		lt.Store(key, node)
	}

	if victim.PriorId != 0 {
		// Look up the prior node, set its next to the victim node's next.
		updateNode(victim.PriorId, func(priorNode *PendingInstallNode) {
			priorNode.NextId = victim.NextId
		})
	}

	if victim.NextId != 0 {
		// Look up the next node, set its prior to the victim node's prior.
		updateNode(victim.NextId, func(nextNode *PendingInstallNode) {
			nextNode.PriorId = victim.PriorId
		})
	}
}

func NewListTools(ctx sdk.Context, nodeStore storetypes.KVStore, cdc codec.Codec) *ListTools {
	return &ListTools{
		cdc:       cdc,
		nodeStore: nodeStore,
	}
}
