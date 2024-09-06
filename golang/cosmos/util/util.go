package util

import (
	"github.com/spf13/viper"
)

func IndexOf[T comparable](a []T, x T) int {
	for i, s := range a {
		if s == x {
			return i
		}
	}
	return -1
}

func NewFileOnlyViper(v1 *viper.Viper) (*viper.Viper, error) {
	v2 := viper.New()
	v2.SetConfigFile(v1.ConfigFileUsed())
	err := v2.ReadInConfig()
	return v2, err
}
