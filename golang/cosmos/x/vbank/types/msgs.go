package types

import (
	"fmt"
	"strings"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

var _ sdk.Msg = &MsgSetDenomMetadata{}
const RouterKey = ModuleName // this was defined in your key.go file

// ValidateBasic performs basic validation of MsgSetDenomMetadata
func (m *MsgSetDenomMetadata) ValidateBasic() error {
	if strings.TrimSpace(m.Authority) == "" {
		return fmt.Errorf("authority cannot be blank")
	}

	return m.Metadata.Validate()
}
