package swingset

import (
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/x/bank"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	coinKeeper bank.Keeper

	storeKey sdk.StoreKey // Unexposed key to access store from sdk.Context

	cdc *codec.Codec // The wire codec for binary encoding/decoding.
}

// NewKeeper creates new instances of the swingset Keeper
func NewKeeper(coinKeeper bank.Keeper, storeKey sdk.StoreKey, cdc *codec.Codec) Keeper {
	return Keeper{
		coinKeeper: coinKeeper,
		storeKey:   storeKey,
		cdc:        cdc,
	}
}

// Gets the entire mailbox struct for a peer
func (k Keeper) GetMailbox(ctx sdk.Context, peer string) Mailbox {
	store := ctx.KVStore(k.storeKey)
	if !store.Has([]byte(peer)) {
		return NewMailbox()
	}
	path := "data:mailbox." + peer
	bz := store.Get([]byte(path))
	var mailbox Mailbox
	k.cdc.MustUnmarshalBinaryBare(bz, &mailbox)
	return mailbox
}

// Sets the entire mailbox struct for a peer
func (k Keeper) SetMailbox(ctx sdk.Context, peer string, mailbox Mailbox) {
	store := ctx.KVStore(k.storeKey)
	path := "data:mailbox." + peer
	store.Set([]byte(path), k.cdc.MustMarshalBinaryBare(mailbox))
}

// Get an iterator over all peers in which the keys are the peers and the values are the mailbox
func (k Keeper) GetPeersIterator(ctx sdk.Context) sdk.Iterator {
	store := ctx.KVStore(k.storeKey)
	return sdk.KVStorePrefixIterator(store, nil)
}
