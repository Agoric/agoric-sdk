package ssd

import (
	"encoding/json"
	"errors"

	dbm "github.com/tendermint/tendermint/libs/db"
)

type storageHandler struct {
	Database dbm.DB
	Prefix   string
}

type storageMessage struct {
	Method string `json:"method"`
	Key    string `json:"key"`
	Value  string `json:"value"`
}

func NewPrefixedDBStorageHandler(prefix string, db dbm.DB) *storageHandler {
	return &storageHandler{
		Database: db,
		Prefix:   prefix,
	}
}

func (sh *storageHandler) Receive(str string) (string, error) {
	msg := new(storageMessage)
	err := json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return "", err
	}

	// TODO: Actually use generic store, not just mailboxes.
	switch msg.Method {
	case "set":
		return "", errors.New("Cannot set read-only storage")

	case "get":
		sh.Database.Print()
		return "", errors.New(msg.Method + ": Not implemented")

	case "has":
	case "keys":
	case "entries":
	case "values":
	case "size":
		// TODO: Implement these operations
	}

	return "", errors.New("Unrecognized msg.Method " + msg.Method)
}
