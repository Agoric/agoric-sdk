module github.com/Agoric/cosmic-swingset

go 1.13

require (
	github.com/bartekn/go-bip39 v0.0.0-20171116152956-a05967ea095d // indirect
	github.com/coreos/go-etcd v2.0.0+incompatible // indirect
	github.com/cosmos/cosmos-sdk v0.34.4-0.20200327170214-3b48464bb4dc
	github.com/cpuguy83/go-md2man v1.0.10 // indirect
	github.com/gogo/protobuf v1.3.1
	github.com/golang/protobuf v1.4.0-rc.4
	github.com/gorilla/mux v1.7.4
	github.com/regen-network/cosmos-proto v0.1.1-0.20200213154359-02baa11ea7c2
	github.com/spf13/afero v1.2.2 // indirect
	github.com/spf13/cobra v0.0.6
	github.com/spf13/viper v1.6.2
	github.com/stumble/gorocksdb v0.0.3 // indirect
	github.com/tendermint/go-amino v0.15.1
	github.com/tendermint/tendermint v0.33.2
	github.com/tendermint/tm-db v0.5.0
	github.com/ugorji/go/codec v0.0.0-20181204163529-d75b2dcb6bc8 // indirect
)

// go get github.com/agoric-labs/cosmos-sdk@dibc
replace github.com/cosmos/cosmos-sdk => github.com/agoric-labs/cosmos-sdk v0.34.4-0.20200331010310-b5070a48908e
