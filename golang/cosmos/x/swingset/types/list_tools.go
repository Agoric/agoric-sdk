package types

import (
	"fmt"

	storetypes "cosmossdk.io/store"
	"github.com/cosmos/cosmos-sdk/codec"
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

// Unlink removes a node from a non-circular list where PrevId == 0 indicates
// the head and NextId == 0 indicates the tail.
func (lt ListTools) Unlink(victim *ChunkedArtifactNode, updateEnds func(first, last *uint64)) error {
	if victim == nil {
		return fmt.Errorf("missing chunked artifact node during unlink")
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

	updateNode := func(id uint64, op string, mutate func(*ChunkedArtifactNode)) error {
		key := lt.Key(id)
		node := lt.Fetch(key)
		if node == nil {
			return fmt.Errorf("missing chunked artifact node id=%d during %s", id, op)
		}
		mutate(node)
		lt.Store(key, node)
		return nil
	}

	if victim.PrevId != 0 {
		// Look up the previous node, set its next to the victim node's next.
		if err := updateNode(victim.PrevId, "unlink prev", func(prevNode *ChunkedArtifactNode) {
			prevNode.NextId = victim.NextId
		}); err != nil {
			return err
		}
	}

	if victim.NextId != 0 {
		// Look up the next node, set its previous to the victim node's previous.
		if err := updateNode(victim.NextId, "unlink next", func(nextNode *ChunkedArtifactNode) {
			nextNode.PrevId = victim.PrevId
		}); err != nil {
			return err
		}
	}

	return nil
}

func NewListTools(ctx sdk.Context, nodeStore storetypes.KVStore, cdc codec.Codec) *ListTools {
	return &ListTools{
		cdc:       cdc,
		nodeStore: nodeStore,
	}
}
