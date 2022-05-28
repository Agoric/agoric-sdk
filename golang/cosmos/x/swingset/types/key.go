package types

const (
	// module name
	ModuleName = "swingset"

	// StoreKey to be used when creating the KVStore
	StoreKey = ModuleName
)

var (
	DataKeyPrefix  = []byte(ModuleName + "/data")
	MetaKeyPrefix  = []byte{0}
	BatchKeyPrefix = MetaKeyPrefix
)
