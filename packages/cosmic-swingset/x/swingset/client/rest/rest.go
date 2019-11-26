package rest

import (
	"fmt"

	"github.com/cosmos/cosmos-sdk/client/context"

	"github.com/gorilla/mux"
)

const (
	pathName = "storage"
	keysName = "keys"
	peerName = "peer"
)

// RegisterRoutes - Central function to define routes that get registered by the main application
func RegisterRoutes(cliCtx context.CLIContext, r *mux.Router, storeName string) {
	r.HandleFunc(fmt.Sprintf("/%s/mailbox/{%s}", storeName, peerName), getMailboxHandler(cliCtx, storeName)).Methods("GET")
	r.HandleFunc(fmt.Sprintf("/%s/mailbox", storeName), deliverMailboxHandler(cliCtx)).Methods("POST")
	r.HandleFunc(fmt.Sprintf("/%s/storage/{%s}", storeName, pathName), getStorageHandler(cliCtx, storeName)).Methods("GET")
	r.HandleFunc(fmt.Sprintf("/%s/keys/{%s}", storeName, keysName), getKeysHandler(cliCtx, keysName)).Methods("GET")
	r.HandleFunc(fmt.Sprintf("/%s/keys", storeName), getKeysHandler(cliCtx, keysName)).Methods("GET")
}
