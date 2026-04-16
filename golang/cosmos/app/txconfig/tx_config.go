package txconfig

import (
	"fmt"

	txsigning "cosmossdk.io/x/tx/signing"
	"cosmossdk.io/x/tx/signing/aminojson"
	"cosmossdk.io/x/tx/signing/direct"
	"cosmossdk.io/x/tx/signing/directaux"
	"cosmossdk.io/x/tx/signing/textual"
	agorictypes "github.com/Agoric/agoric-sdk/golang/cosmos/types"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	signingtypes "github.com/cosmos/cosmos-sdk/types/tx/signing"
	"github.com/cosmos/cosmos-sdk/x/auth/tx"
)

var legacyAddress = "legacy_address"
var nullSliceAsEmpty = "null_slice_as_empty"

type configTx struct {
	decoder     sdk.TxDecoder
	encoder     sdk.TxEncoder
	jsonDecoder sdk.TxDecoder
	jsonEncoder sdk.TxEncoder
	protoCodec  codec.Codec
}

// CustomAminoFieldEncoders is a map of custom amino field encoders for amino json
var CustomAminoFieldEncoders = map[string]aminojson.FieldEncoder{
	legacyAddress:    agorictypes.LegacyAddressEncoder,
	nullSliceAsEmpty: aminojson.NullSliceAsEmptyEncoder,
}

// NewTxConfigWithOptions returns a new protobuf TxConfig using the provided ProtoCodec, ConfigOptions and
// custom sign mode handlers. If ConfigOptions is an empty struct then default values will be used.
func NewTxConfigWithOptionsWithCustomEncoders(protoCodec codec.Codec, configOptions tx.ConfigOptions) (client.TxConfig, error) {
	txConfig := &configTx{
		protoCodec:  protoCodec,
		decoder:     configOptions.ProtoDecoder,
		encoder:     configOptions.ProtoEncoder,
		jsonDecoder: configOptions.JSONDecoder,
		jsonEncoder: configOptions.JSONEncoder,
	}
	if configOptions.ProtoDecoder == nil {
		txConfig.decoder = tx.DefaultTxDecoder(protoCodec)
	}
	if configOptions.ProtoEncoder == nil {
		txConfig.encoder = tx.DefaultTxEncoder()
	}
	if configOptions.JSONDecoder == nil {
		txConfig.jsonDecoder = tx.DefaultJSONTxDecoder(protoCodec)
	}
	if configOptions.JSONEncoder == nil {
		txConfig.jsonEncoder = tx.DefaultJSONTxEncoder(protoCodec)
	}

	var err error
	if configOptions.SigningContext == nil {
		if configOptions.SigningOptions == nil {
			configOptions.SigningOptions, err = tx.NewDefaultSigningOptions()
			if err != nil {
				return nil, err
			}
		}
		if configOptions.SigningOptions.FileResolver == nil {
			configOptions.SigningOptions.FileResolver = protoCodec.InterfaceRegistry()
		}
		configOptions.SigningContext, err = txsigning.NewContext(*configOptions.SigningOptions)
		if err != nil {
			return nil, err
		}
	}

	configOptions.SigningHandler, err = NewSigningHandlerMap(configOptions)

	if err != nil {
		return nil, err
	}
	return tx.NewTxConfigWithOptions(txConfig.protoCodec, configOptions)

}

func NewSigningHandlerMap(configOpts tx.ConfigOptions) (*txsigning.HandlerMap, error) {
	var err error
	if configOpts.SigningOptions == nil {
		configOpts.SigningOptions, err = tx.NewDefaultSigningOptions()
		if err != nil {
			return nil, err
		}
	}

	if configOpts.SigningContext == nil {
		configOpts.SigningContext, err = txsigning.NewContext(*configOpts.SigningOptions)
		if err != nil {
			return nil, err
		}
	}

	signingOpts := configOpts.SigningOptions

	if len(configOpts.EnabledSignModes) == 0 {
		configOpts.EnabledSignModes = tx.DefaultSignModes
	}

	lenSignModes := len(configOpts.EnabledSignModes)
	handlers := make([]txsigning.SignModeHandler, lenSignModes+len(configOpts.CustomSignModes))
	for i, m := range configOpts.EnabledSignModes {
		var err error
		switch m {
		case signingtypes.SignMode_SIGN_MODE_DIRECT:
			handlers[i] = &direct.SignModeHandler{}
		case signingtypes.SignMode_SIGN_MODE_DIRECT_AUX:
			handlers[i], err = directaux.NewSignModeHandler(directaux.SignModeHandlerOptions{
				TypeResolver:   signingOpts.TypeResolver,
				SignersContext: configOpts.SigningContext,
			})
			if err != nil {
				return nil, err
			}
		case signingtypes.SignMode_SIGN_MODE_LEGACY_AMINO_JSON:
			// AGORIC: We inject custom amino field encoders for amino json
			//
			aminoHandler, _, err := NewAminoHandlerWithCustomEncoders(configOpts.SigningOptions, CustomAminoFieldEncoders)
			if err != nil {
				return nil, err
			}
			// -------------------------------------------------
			handlers[i] = aminoHandler
		case signingtypes.SignMode_SIGN_MODE_TEXTUAL:
			handlers[i], err = textual.NewSignModeHandler(textual.SignModeOptions{
				CoinMetadataQuerier: configOpts.TextualCoinMetadataQueryFn,
				FileResolver:        signingOpts.FileResolver,
				TypeResolver:        signingOpts.TypeResolver,
			})
			if configOpts.TextualCoinMetadataQueryFn == nil {
				return nil, fmt.Errorf("cannot enable SIGN_MODE_TEXTUAL without a TextualCoinMetadataQueryFn")
			}
			if err != nil {
				return nil, err
			}
		}
	}
	for i, m := range configOpts.CustomSignModes {
		handlers[i+lenSignModes] = m
	}
	handler := txsigning.NewHandlerMap(handlers...)
	return handler, nil

}

func NewAminoHandlerWithCustomEncoders(signingOpts *txsigning.Options, fieldEncoders map[string]aminojson.FieldEncoder) (*aminojson.SignModeHandler, aminojson.Encoder, error) {
	encoderOptions := aminojson.EncoderOptions{
		FileResolver: signingOpts.FileResolver,
		TypeResolver: signingOpts.TypeResolver,
		EnumAsString: false, // ensure enum as string is disabled
	}
	encoder := aminojson.NewEncoder(encoderOptions)
	for name, customFieldEncoder := range fieldEncoders {
		encoder.DefineFieldEncoding(name, customFieldEncoder)
	}
	aminoHandler := aminojson.NewSignModeHandler(aminojson.SignModeHandlerOptions{
		FileResolver: signingOpts.FileResolver,
		TypeResolver: signingOpts.TypeResolver,
		Encoder:      &encoder,
	})
	return aminoHandler, encoder, nil
}
