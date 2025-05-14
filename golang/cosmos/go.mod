module github.com/Agoric/agoric-sdk/golang/cosmos

go 1.23

toolchain go1.23.4

require (
	cosmossdk.io/api v0.7.5
	cosmossdk.io/errors v1.0.1
	cosmossdk.io/log v1.4.1
	cosmossdk.io/math v1.4.0
	cosmossdk.io/store v1.1.1
	cosmossdk.io/tools/rosetta v0.2.1
	cosmossdk.io/x/evidence v0.1.1
	cosmossdk.io/x/feegrant v0.1.1
	cosmossdk.io/x/upgrade v0.1.4
	github.com/cometbft/cometbft v0.38.13
	github.com/cometbft/cometbft-db v0.14.1
	github.com/cosmos/cosmos-sdk v0.50.9
	github.com/cosmos/gogoproto v1.7.0
	github.com/cosmos/ibc-apps/middleware/packet-forward-middleware/v8 v8.1.0
	github.com/cosmos/ibc-go/modules/capability v1.0.1
	github.com/cosmos/ibc-go/v8 v8.5.2
	github.com/golang/protobuf v1.5.4
	github.com/gorilla/mux v1.8.1
	github.com/grpc-ecosystem/grpc-gateway v1.16.0
	github.com/hashicorp/go-metrics v0.5.3
  github.com/iancoleman/orderedmap v0.3.0
	github.com/pkg/errors v0.9.1
	github.com/rakyll/statik v0.1.7
  github.com/spf13/cast v1.7.0
	github.com/spf13/cobra v1.8.1
	github.com/spf13/pflag v1.0.5
	github.com/spf13/viper v1.19.0
	github.com/stretchr/testify v1.10.0
	google.golang.org/genproto/googleapis/api v0.0.0-20240814211410-ddb44dafa142
	google.golang.org/grpc v1.68.0
	gopkg.in/yaml.v2 v2.4.0
)

require (
	cosmossdk.io/simapp v0.0.0-00010101000000-000000000000
	github.com/gogo/protobuf v1.3.2
	github.com/prometheus/client_golang v1.20.5 // indirect
)

require (
	gopkg.in/ini.v1 v1.67.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
	gotest.tools/v3 v3.5.1 // indirect
	nhooyr.io/websocket v1.8.6 // indirect
	pgregory.net/rapid v1.1.0 // indirect
	sigs.k8s.io/yaml v1.4.0 // indirect
)

replace (
	github.com/99designs/keyring => github.com/cosmos/keyring v1.2.0

	github.com/btcsuite/btcd/btcec/v2 => github.com/btcsuite/btcd/btcec/v2 v2.3.2

	// https://pkg.go.dev/vuln/GO-2023-2409
	github.com/dvsekhvalnov/jose2go => github.com/dvsekhvalnov/jose2go v1.5.1-0.20231206184617-48ba0b76bc88

	// Fix upstream GHSA-3vp4-m3rf-835h vulnerability.
	github.com/gin-gonic/gin => github.com/gin-gonic/gin v1.9.0

	// https://pkg.go.dev/vuln/GO-2023-1578
	github.com/hashicorp/go-getter => github.com/hashicorp/go-getter v1.7.0

	// replace broken goleveldb.
	github.com/syndtr/goleveldb => github.com/syndtr/goleveldb v1.0.1-0.20210819022825-2ae1ddf74ef7
)

// Agoric-specific replacements:
replace (
  // TODO: Use parts of our fork of cosmos-sdk.
	// cosmossdk.io/api => github.com/agoric-labs/cosmos-sdk/api v0.0.0-20250326031203-e68e6747bede
	// cosmossdk.io/core => github.com/agoric-labs/cosmos-sdk/core v0.0.0-20250326031203-e68e6747bede
	// cosmossdk.io/depinject => github.com/agoric-labs/cosmos-sdk/depinject v0.0.0-20250326031203-e68e6747bede
	// cosmossdk.io/errors => github.com/agoric-labs/cosmos-sdk/errors v0.0.0-20250326031203-e68e6747bede
	// cosmossdk.io/math => github.com/agoric-labs/cosmos-sdk/math v0.0.0-20250326031203-e68e6747bede
	// cosmossdk.io/simapp => github.com/agoric-labs/cosmos-sdk/simapp v0.0.0-20250326031203-e68e6747bede
	// cosmossdk.io/tools/rosetta => github.com/agoric-labs/cosmos-sdk/tools/rosetta v0.0.0-20250326031203-e68e6747bede

	// use cometbft
	// Use our fork at least until post-v0.34.14 is released with
	// https://github.com/cometbft/cometbft/issue/6899 resolved.
	github.com/cometbft/cometbft => github.com/agoric-labs/cometbft v0.37.15-alpha.agoric.1

	// We need a fork of cosmos-sdk until all of the differences are merged.
	github.com/cosmos/cosmos-sdk => github.com/agoric-labs/cosmos-sdk v0.46.16-alpha.agoric.2.4.0.20241231161927-03ea5e469b71

	// And a PFM compatible with the other Agoric forks.
	// github.com/cosmos/ibc-apps/middleware/packet-forward-middleware/v8 => github.com/agoric-labs/ibc-apps/middleware/packet-forward-middleware/v7 v7.3.0-alpha.agoric.1

	// Use a version of ibc-go that is compatible with the above forks.
	github.com/cosmos/ibc-go/v8 => github.com/agoric-labs/ibc-go/v8 v8.0.0-20250106120251-131babedfe63

// Ensure specific packages use your fork
// cosmossdk.io/store =>  github.com/agoric-labs/cosmos-sdk/store 86e44a02f6bff69aa20977a70f088abaaaa0bf9f
// github.com/cosmos/cosmos-sdk/types => github.com/agoric-labs/cosmos-sdk/types 86e44a02f6bff69aa20977a70f088abaaaa0bf9f
// github.com/cosmos/cosmos-sdk/store => github.com/agoric-labs/cosmos-sdk/store 86e44a02f6bff69aa20977a70f088abaaaa0bf9f
// Add other specific package replacements as needed
// github.com/cosmos/cosmos-sdk/x/auth => github.com/agoric-labs/cosmos-sdk/x/auth 86e44a02f6bff69aa20977a70f088abaaaa0bf9f
// github.com/cosmos/cosmos-sdk/x/bank => github.com/agoric-labs/cosmos-sdk/x/bank 86e44a02f6bff69aa20977a70f088abaaaa0bf9f
// github.com/cosmos/cosmos-sdk/x/staking => github.com/agoric-labs/cosmos-sdk/x/staking 86e44a02f6bff69aa20977a70f088abaaaa0bf9f
)
