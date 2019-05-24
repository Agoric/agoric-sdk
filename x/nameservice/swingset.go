package nameservice

import (
	"encoding/json"
)

const SWINGSET_PORT = 17

type swingSetName = struct {
	Type  string `json:"type"`
	Name  string `json:"name"`
	Value string `json:"value"`
}

var NodeMessageSender func(port int, needReply bool, str string) (string, error)

func SendToNode(str string) error {
	_, err := NodeMessageSender(SWINGSET_PORT, false, str)
	return err
}

func CallToNode(str string) (string, error) {
	return NodeMessageSender(SWINGSET_PORT, true, str)
}

func SwingSetName(name, value string) (*swingSetName, error) {
	ssn := &swingSetName{
		Type:  "SET_NAME",
		Name:  name,
		Value: value,
	}
	b, err := json.Marshal(ssn)
	if err != nil {
		return nil, err
	}
	out, err := CallToNode(string(b))
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal([]byte(out), ssn)
	if err != nil {
		return nil, err
	}

	return ssn, nil
}
