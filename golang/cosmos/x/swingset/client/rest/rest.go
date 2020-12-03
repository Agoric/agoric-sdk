package rest

import (
	"fmt"

	"github.com/cosmos/cosmos-sdk/client"
	"github.com/gorilla/mux"
)

const (
	pathName = "path"
	keysName = "keys"
	peerName = "peer"
)

// RegisterRoutes - Central function to define routes that get registered by the main application
func RegisterRoutes(cliCtx client.Context, r *mux.Router, storeName string) {
	r.HandleFunc(fmt.Sprintf("/%s/egress/{%s}", storeName, peerName), getEgressHandler(cliCtx, storeName)).Methods("GET")
	r.HandleFunc(fmt.Sprintf("/%s/mailbox/{%s}", storeName, peerName), getMailboxHandler(cliCtx, storeName)).Methods("GET")
	r.HandleFunc(fmt.Sprintf("/%s/storage/{%s}", storeName, pathName), getStorageHandler(cliCtx, storeName)).Methods("GET")
	r.HandleFunc(fmt.Sprintf("/%s/keys/{%s}", storeName, keysName), getKeysHandler(cliCtx, storeName)).Methods("GET")
	r.HandleFunc(fmt.Sprintf("/%s/keys", storeName), getKeysHandler(cliCtx, storeName)).Methods("GET")
}
