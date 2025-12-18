package types

import (
	"fmt"
	"strings"
)

const RouterKey = ModuleName // this was defined in your key.go file

// Validate performs basic validation of Metadata fields
func (m Metadata) Validate() error {
	if strings.TrimSpace(m.Base) == "" {
		return fmt.Errorf("base denom cannot be blank")
	}

	if len(m.DenomUnits) == 0 {
		return fmt.Errorf("denom units cannot be empty")
	}

	// Verify that base denom exists in denom_units with exponent 0
	hasBaseDenom := false
	seenDenoms := make(map[string]bool)

	for _, unit := range m.DenomUnits {
		if strings.TrimSpace(unit.Denom) == "" {
			return fmt.Errorf("denom unit denom cannot be blank")
		}

		if seenDenoms[unit.Denom] {
			return fmt.Errorf("duplicate denom unit: %s", unit.Denom)
		}
		seenDenoms[unit.Denom] = true

		if unit.Denom == m.Base && unit.Exponent == 0 {
			hasBaseDenom = true
		}

		for _, alias := range unit.Aliases {
			if strings.TrimSpace(alias) == "" {
				return fmt.Errorf("denom unit alias cannot be blank")
			}
		}
	}

	if !hasBaseDenom {
		return fmt.Errorf("base denom %s must have a denom unit with exponent 0", m.Base)
	}

	if m.Display != "" {
		if !seenDenoms[m.Display] {
			return fmt.Errorf("display denom %s must be present in denom units", m.Display)
		}
	}

	return nil
}

// ValidateBasic performs basic validation of MsgSetDenomMetaData
func (m *MsgSetDenomMetaData) ValidateBasic() error {
	if strings.TrimSpace(m.Authority) == "" {
		return fmt.Errorf("authority cannot be blank")
	}

	return m.Metadata.Validate()
}

