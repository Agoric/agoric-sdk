package helpers

import "fmt"

func RecoverToError(outErr *error) {
	if r := recover(); r != nil {
		err, ok := r.(error)
		if !ok {
			err = fmt.Errorf("recovered: %v", r)
		}
		*outErr = err
	}
}
