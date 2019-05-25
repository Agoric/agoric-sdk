package swingset

const EmptyMailboxValue = "[[], -1]"

type Mailbox struct {
	Value string `json:"value"`
}

// Returns a new Mailbox with an empty mailbox
func NewMailbox() Mailbox {
	return Mailbox{
		Value: EmptyMailboxValue,
	}
}
