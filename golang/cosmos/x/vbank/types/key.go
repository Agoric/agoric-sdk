package types

const (
	// module name
	ModuleName = "vbank"

	// StoreKey to be used when creating the KVStore
	StoreKey = ModuleName

	// TStoreKey to be used when creating the transient store.
	TStoreKey = "transient_" + ModuleName

	ReservePoolName   = "vbank/reserve"
	GiveawayPoolName  = "vbank/giveaway"
	ProvisionPoolName = "vbank/provision"
)
