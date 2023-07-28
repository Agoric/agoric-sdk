package capdata

import (
	"bytes"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// JsonMarshal returns JSON text representing its input,
// without special replacement of "<", ">", "&", U+2028, or U+2029.
func JsonMarshal(val any) ([]byte, error) {
	buf := &bytes.Buffer{}
	encoder := json.NewEncoder(buf)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(val); err != nil {
		return nil, err
	}
	// Return without a trailing line feed.
	lineTerminatedJson := buf.Bytes()
	return bytes.TrimSuffix(lineTerminatedJson, []byte("\n")), nil
}

// cf. https://github.com/endojs/endo/tree/master/packages/marshal

type Capdata struct {
	Body  string        `json:"body"`
	Slots []interface{} `json:"slots"`
}

var validBigint = regexp.MustCompile(`^-?(?:0|[1-9][0-9]*)$`)

type CapdataBigint struct {
	Normalized string
}

type CapdataRemotable struct {
	Id             interface{}
	Iface          *string
	Representation interface{}
}

func NewCapdataBigint(str string) *CapdataBigint {
	if !validBigint.MatchString(str) {
		return nil
	}
	bigint := CapdataBigint{str}
	return &bigint
}

func (r *CapdataRemotable) MarshalJSON() ([]byte, error) {
	return JsonMarshal(r.Representation)
}

type CapdataValueTransformations struct {
	Bigint    func(*CapdataBigint) interface{}
	Remotable func(*CapdataRemotable) interface{}
}

// upsertCapdataRemotable either adds a new CapdataRemotable to `remotables` at the specified
// slot index or updates the iface of the value that is already there, ensuring lack of iface name
// inconsistency (iteration order is not guaranteed to correspond with JSON text like it does in
// JavaScript, so we must accept encountering the "first" reference to a slot late
// and must therefore also defer transformations).
func upsertCapdataRemotable(remotables map[uint64]*CapdataRemotable, slotIndex uint64, id interface{}, iface *string) (*CapdataRemotable, error) {
	r := remotables[slotIndex]
	if r == nil {
		r = new(CapdataRemotable)
		r.Id = id
		r.Iface = iface
		remotables[slotIndex] = r
	} else if iface != nil {
		if r.Iface != nil && *iface != *r.Iface {
			return nil, fmt.Errorf("slot iface mismatch: %q", *iface)
		}
		r.Iface = iface
	}
	return r, nil
}

// decodeCapdataLegacyValue decodes the non-smallcaps encoding of
// https://github.com/endojs/endo/blob/master/packages/marshal/src/encodeToCapData.js
func decodeCapdataLegacyValue(
	encoded interface{},
	slots []interface{},
	remotables map[uint64]*CapdataRemotable,
	transformations CapdataValueTransformations,
) (interface{}, error) {
	if arr, ok := encoded.([]interface{}); ok {
		for i, v := range arr {
			decoded, err := decodeCapdataLegacyValue(v, slots, remotables, transformations)
			if err != nil {
				return nil, err
			}
			arr[i] = decoded
		}
		return arr, nil
	} else if obj, ok := encoded.(map[string]interface{}); ok {
		if qclassVal, ok := obj["@qclass"]; ok {
			qclass, ok := qclassVal.(string)
			if !ok {
				return nil, fmt.Errorf("invalid @qclass: %q", qclassVal)
			}
			switch qclass {
			case "bigint":
				var bigint *CapdataBigint
				digitsVal := obj["digits"]
				if digitsStr, ok := digitsVal.(string); ok {
					bigint = NewCapdataBigint(digitsStr)
				}
				if bigint == nil {
					return nil, fmt.Errorf("invalid bigint: %q", digitsVal)
				}
				if transformations.Bigint == nil {
					return nil, fmt.Errorf("untransformed bigint")
				}
				return transformations.Bigint(bigint), nil
			case "slot":
				var iface *string
				slotIndexVal, ifaceVal := obj["index"], obj["iface"]
				slotIndexNum, ok := slotIndexVal.(float64)
				slotIndex := uint64(slotIndexNum)
				if !ok || float64(slotIndex) != slotIndexNum || slotIndex >= uint64(len(slots)) {
					return nil, fmt.Errorf("invalid slot index: %q", slotIndexVal)
				}
				if ifaceStr, ok := ifaceVal.(string); ok {
					iface = &ifaceStr
				} else if ifaceVal != nil {
					return nil, fmt.Errorf("invalid slot iface: %q", ifaceVal)
				}
				return upsertCapdataRemotable(remotables, slotIndex, slots[slotIndex], iface)
			case "hilbert":
				fallthrough
			case "undefined":
				fallthrough
			case "NaN":
				fallthrough
			case "Infinity":
				fallthrough
			case "symbol":
				fallthrough
			case "tagged":
				fallthrough
			case "error":
				fallthrough
			case "-Infinity":
				return nil, fmt.Errorf("not implemented: @qclass %q", qclass)
			default:
				return nil, fmt.Errorf("unrecognized @qclass: %q", qclass)
			}
		}
		for k, v := range obj {
			decoded, err := decodeCapdataLegacyValue(v, slots, remotables, transformations)
			if err != nil {
				return nil, err
			}
			obj[k] = decoded
		}
		return obj, nil
	} else {
		return encoded, nil
	}
}

// decodeCapdataSmallcapsValue decodes the "smallcaps" encoding from
// https://github.com/endojs/endo/blob/master/packages/marshal/src/encodeToSmallcaps.js
func decodeCapdataSmallcapsValue(
	encoded interface{},
	slots []interface{},
	remotables map[uint64]*CapdataRemotable,
	transformations CapdataValueTransformations,
) (interface{}, error) {
	if arr, ok := encoded.([]interface{}); ok {
		for i, v := range arr {
			decoded, err := decodeCapdataSmallcapsValue(v, slots, remotables, transformations)
			if err != nil {
				return nil, err
			}
			arr[i] = decoded
		}
		return arr, nil
	} else if encodedObj, ok := encoded.(map[string]interface{}); ok {
		if _, ok := encodedObj["#tag"]; ok {
			return nil, fmt.Errorf("not implemented: #tag")
		}
		if _, ok := encodedObj["#error"]; ok {
			return nil, fmt.Errorf("not implemented: #error")
		}
		// We need a distinct output map to avoid reprocessing already-decoded keys.
		decodedObj := make(map[string]interface{}, len(encodedObj))
		for encodedK, v := range encodedObj {
			if strings.HasPrefix(encodedK, "#") {
				return nil, fmt.Errorf("unrecognized record type: %q", encodedK)
			}
			decodedK, err := decodeCapdataSmallcapsValue(encodedK, slots, remotables, CapdataValueTransformations{})
			k, ok := decodedK.(string)
			if err != nil || !ok {
				return nil, fmt.Errorf("invalid copyRecord key: %q", encodedK)
			}
			decoded, err := decodeCapdataSmallcapsValue(v, slots, remotables, transformations)
			if err != nil {
				return nil, err
			}
			decodedObj[k] = decoded
		}
		return decodedObj, nil
	} else if str, ok := encoded.(string); ok {
		if len(str) == 0 {
			return str, nil
		}
		switch str[0] {
		case '!':
			return str[1:], nil
		case '+':
			// Normalize to no leading "+".
			str = str[1:]
			fallthrough
		case '-':
			bigint := NewCapdataBigint(str)
			if bigint == nil {
				return nil, fmt.Errorf("invalid bigint: %q", encoded.(string))
			}
			if transformations.Bigint == nil {
				return nil, fmt.Errorf("untransformed bigint")
			}
			return transformations.Bigint(bigint), nil
		case '$':
			var slotIndexStr string
			var iface *string
			if dotIndex := strings.IndexByte(str, '.'); dotIndex >= 0 {
				slotIndexStr = str[1:dotIndex]
				ifaceStr := str[dotIndex+1:]
				iface = &ifaceStr
			} else {
				slotIndexStr = str[1:]
			}
			slotIndex, err := strconv.ParseUint(slotIndexStr, 10, 0)
			if err != nil || slotIndex >= uint64(len(slots)) {
				return nil, fmt.Errorf("invalid slot index: %q", str)
			}
			r, err := upsertCapdataRemotable(remotables, slotIndex, slots[slotIndex], iface)
			if err != nil {
				return nil, fmt.Errorf("slot iface mismatch: %q", str)
			}
			return r, nil
		case '#':
			fallthrough
		case '%':
			fallthrough
		case '&':
			return nil, fmt.Errorf("not implemented: %q", str)
		default:
			if str[0] >= '!' && str[0] <= '-' {
				return nil, fmt.Errorf("invalid smallcaps encoding prefix: %q", str[:1])
			}
		}
		return str, nil
	} else {
		return encoded, nil
	}
}

// DecodeSerializedCapdata accepts JSON text representing encoded CapData and
// decodes it, applying specified transformations for values that otherwise
// hinder interchange.
func DecodeSerializedCapdata(
	serializedCapdata string,
	transformations CapdataValueTransformations,
) (interface{}, error) {
	var capdata Capdata
	if err := json.Unmarshal([]byte(serializedCapdata), &capdata); err != nil {
		return nil, err
	}
	if capdata.Body == "" || capdata.Slots == nil {
		return nil, fmt.Errorf("invalid CapData")
	}
	serializedBody, decodeValue := capdata.Body, decodeCapdataLegacyValue
	if strings.HasPrefix(serializedBody, "#") {
		serializedBody, decodeValue = serializedBody[1:], decodeCapdataSmallcapsValue
	}
	var encoded interface{}
	if err := json.Unmarshal([]byte(serializedBody), &encoded); err != nil {
		return nil, err
	}
	remotables := map[uint64]*CapdataRemotable{}
	decoded, err := decodeValue(encoded, capdata.Slots, remotables, transformations)
	if err == nil && len(remotables) > 0 {
		if transformations.Remotable == nil {
			return nil, fmt.Errorf("untransformed remotable")
		}
		for _, r := range remotables {
			r.Representation = transformations.Remotable(r)
		}
	}
	return decoded, err
}
