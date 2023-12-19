package types

import (
	"encoding/json"
	"errors"

	vstoragetypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const EmptyMailboxValue = `"{\"outbox\":[], \"ack\":0}"`

// Returns a new Mailbox with an empty mailbox
func NewMailbox() *vstoragetypes.Data {
	return &vstoragetypes.Data{
		Value: EmptyMailboxValue,
	}
}

func NewEgress(nickname string, peer sdk.AccAddress, powerFlags []string) *Egress {
	return &Egress{
		Nickname:   nickname,
		Peer:       peer,
		PowerFlags: powerFlags,
	}
}

// FIXME: Should have @endo/nat
func Nat(num float64) (uint64, error) {
	if num < 0 {
		return 0, errors.New("Not a natural")
	}

	nat := uint64(num)
	if float64(nat) != num {
		return 0, errors.New("Not a precise integer")
	}

	return nat, nil
}

type Messages struct {
	Nums     []uint64
	Messages []string
	Ack      uint64
}

// UnmarshalMessagesJSON decodes Messages from JSON text.
// Input must represent an array in which the first element is an array of
// [messageNum: integer, messageBody: string] pairs and the second element is
// an "Ack" integer.
func UnmarshalMessagesJSON(jsonString string) (ret *Messages, err error) {
	packet := [2]interface{}{}
	err = json.Unmarshal([]byte(jsonString), &packet)
	if err != nil {
		return nil, err
	}

	ret = &Messages{}

	ackFloat, ok := packet[1].(float64)
	if !ok {
		return nil, errors.New("Ack is not an integer")
	}
	ret.Ack, err = Nat(ackFloat)
	if err != nil {
		return nil, err
	}

	msgs, ok := packet[0].([]interface{})
	if !ok {
		return nil, errors.New("Messages is not an array")
	}

	ret.Messages = make([]string, len(msgs))
	ret.Nums = make([]uint64, len(msgs))
	for i, rawMsg := range msgs {
		arrMsg, ok := rawMsg.([]interface{})
		if !ok || len(arrMsg) != 2 {
			return nil, errors.New("Message is not a pair")
		}

		numFloat, ok := arrMsg[0].(float64)
		if !ok {
			return nil, errors.New("Message Num is not an integer")
		}
		ret.Nums[i], err = Nat(numFloat)
		if err != nil {
			return nil, errors.New("Message num is not a Nat")
		}

		ret.Messages[i], ok = arrMsg[1].(string)
		if !ok {
			return nil, errors.New("Message is not a string")
		}
	}

	return ret, nil
}

func QueueSizeEntry(qs []QueueSize, key string) (int32, bool) {
	for _, q := range qs {
		if q.Key == key {
			return q.Size_, true
		}
	}
	return 0, false
}
