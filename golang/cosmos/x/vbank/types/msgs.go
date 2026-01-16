package types

import (
	"fmt"
	"strings"
)

const RouterKey = ModuleName // this was defined in your key.go file

// ValidateBasic performs basic validation of MsgSetDenomMetadata
func (m *MsgSetDenomMetadata) ValidateBasic() error {
	if strings.TrimSpace(m.Authority) == "" {
		return fmt.Errorf("authority cannot be blank")
	}

	return m.Metadata.Validate()
}
