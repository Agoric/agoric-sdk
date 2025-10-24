package types

import (
	"github.com/cosmos/cosmos-sdk/codec"
	storetypes "cosmossdk.io/store"
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

func (lt ListTools) Fetch(key ListKey) *ChunkedArtifactNode {
	var node ChunkedArtifactNode
	if !lt.nodeStore.Has(key.keyBytes) {
		return nil
	}
	bz := lt.nodeStore.Get(key.keyBytes)
	lt.cdc.MustUnmarshal(bz, &node)
	return &node
}

func (lt ListTools) Store(key ListKey, node *ChunkedArtifactNode) {
	bz := lt.cdc.MustMarshal(node)
	lt.nodeStore.Set(key.keyBytes, bz)
}

func (lt ListTools) Delete(key ListKey) {
	lt.nodeStore.Delete(key.keyBytes)
}

func (lt ListTools) Unlink(victim *ChunkedArtifactNode, updateEnds func(first, last *uint64)) {
	if victim == nil {
		return
	}

	if updateEnds != nil && (victim.PrevId == 0 || victim.NextId == 0) {
		var firstp, lastp *uint64
		if victim.PrevId == 0 {
			// This is the first node in the list.
			first := victim.NextId
			firstp = &first
		}
		if victim.NextId == 0 {
			// This is the last node in the list.
			last := victim.PrevId
			lastp = &last
		}
		updateEnds(firstp, lastp)
	}

	updateNode := func(id uint64, mutate func(*ChunkedArtifactNode)) {
		key := lt.Key(id)
		node := lt.Fetch(key)
		mutate(node)
		lt.Store(key, node)
	}

	if victim.PrevId != 0 {
		// Look up the previous node, set its next to the victim node's next.
		updateNode(victim.PrevId, func(prevNode *ChunkedArtifactNode) {
			prevNode.NextId = victim.NextId
		})
	}

	if victim.NextId != 0 {
		// Look up the next node, set its previous to the victim node's previous.
		updateNode(victim.NextId, func(nextNode *ChunkedArtifactNode) {
			nextNode.PrevId = victim.PrevId
		})
	}
}

func NewListTools(ctx sdk.Context, nodeStore storetypes.KVStore, cdc codec.Codec) *ListTools {
	return &ListTools{
		cdc:       cdc,
		nodeStore: nodeStore,
	}
}
