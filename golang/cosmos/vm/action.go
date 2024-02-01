package vm

import (
	"reflect"
	"strconv"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

var (
	zeroTime                = time.Time{}
	actionHeaderType        = reflect.TypeOf(ActionHeader{})
	_                Action = &ActionHeader{}
)

// Jsonable is a value, j, that can be passed through json.Marshal(j).
type Jsonable interface{}

type Action interface {
	GetActionHeader() ActionHeader
}

// ActionPusher enqueues data for later consumption by the controller.
type ActionPusher func(ctx sdk.Context, action Action) error

// ActionHeader should be embedded in all actions.  It is populated by PopulateAction.
type ActionHeader struct {
	// Type defaults to the `actionType:"..."` tag of the embedder's ActionHeader field.
	Type string `json:"type"`
	// BlockHeight defaults to sdk.Context.BlockHeight().
	BlockHeight int64 `json:"blockHeight,omitempty"`
	// BlockTime defaults to sdk.Context.BlockTime().Unix().
	BlockTime int64 `json:"blockTime,omitempty"`
}

func (ah ActionHeader) GetActionHeader() ActionHeader {
	return ah
}

// SetActionHeaderFromContext provides defaults to an ActionHeader.
func SetActionHeaderFromContext(ctx sdk.Context, actionType string, ah *ActionHeader) {
	// Default the action type.
	if len(ah.Type) == 0 {
		ah.Type = actionType
	}

	// Default the block height.
	if ah.BlockHeight == 0 {
		ah.BlockHeight = ctx.BlockHeight()
	}

	if ah.BlockTime == 0 {
		// Only default to a non-zero block time.
		if blockTime := ctx.BlockTime(); blockTime != zeroTime {
			ah.BlockTime = blockTime.Unix()
		}
	}
}

// PopulateAction interprets `default:"..."` tags and specially handles an
// embedded ActionHeader struct.
func PopulateAction(ctx sdk.Context, action Action) Action {
	oldRv := reflect.Indirect(reflect.ValueOf(action))
	if oldRv.Kind() != reflect.Struct {
		return action
	}

	// Shallow copy to a new value.
	rp := reflect.New(oldRv.Type())
	rv := reflect.Indirect(rp)
	for i := 0; i < rv.NumField(); i++ {
		oldField := oldRv.Field(i)
		field := rv.Field(i)
		fieldType := rv.Type().Field(i)
		if !field.CanSet() {
			continue
		}

		// Copy from original.
		field.Set(oldField)

		// Populate any ActionHeader struct.
		var ahp *ActionHeader
		if fieldType.Type == actionHeaderType {
			ahp = field.Addr().Interface().(*ActionHeader)
		} else if fieldType.Type == reflect.PtrTo(actionHeaderType) {
			if field.IsNil() {
				ahp = &ActionHeader{}
			} else {
				ahp = field.Interface().(*ActionHeader)
			}
		}
		if ahp != nil {
			actionTypeTag, _ := fieldType.Tag.Lookup("actionType")
			ah := *ahp
			SetActionHeaderFromContext(ctx, actionTypeTag, &ah)
			if field.Kind() == reflect.Ptr {
				field.Set(reflect.ValueOf(&ah))
			} else {
				field.Set(reflect.ValueOf(ah))
			}
			continue
		}

		// Still zero value, try default struct field tag.
		defaultTag, _ := fieldType.Tag.Lookup("default")
		if !field.IsZero() || len(defaultTag) == 0 {
			continue
		}

		switch field.Kind() {
		case reflect.String:
			field.SetString(defaultTag)
		case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
			if val, err := strconv.ParseInt(defaultTag, 0, 64); err == nil {
				field.SetInt(val)
			}
		case reflect.Bool:
			if val, err := strconv.ParseBool(defaultTag); err == nil {
				field.SetBool(val)
			}
		case reflect.Float32, reflect.Float64:
			if val, err := strconv.ParseFloat(defaultTag, 64); err == nil {
				field.SetFloat(val)
			}
		}
	}
	return rv.Interface().(Action)
}
