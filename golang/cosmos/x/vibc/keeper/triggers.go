package keeper

import (
	sdk "github.com/cosmos/cosmos-sdk/types"

	ibcexported "github.com/cosmos/ibc-go/v6/modules/core/exported"

	agtypes "github.com/Agoric/agoric-sdk/golang/cosmos/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/types"
)

func (k Keeper) TriggerWriteAcknowledgement(
	ctx sdk.Context,
	target string,
	packet ibcexported.PacketI,
	acknowledgement ibcexported.Acknowledgement,
) error {
	event := types.WriteAcknowledgementEvent{
		Target:          target,
		Packet:          agtypes.CopyToIBCPacket(packet),
		Acknowledgement: acknowledgement.Acknowledgement(),
	}

	err := k.PushAction(ctx, event)
	if err != nil {
		return err
	}

	return nil
}

func (k Keeper) TriggerOnAcknowledgementPacket(
	ctx sdk.Context,
	target string,
	packet ibcexported.PacketI,
	acknowledgement []byte,
	relayer sdk.AccAddress,
) error {
	event := types.AcknowledgementPacketEvent{
		Target:          target,
		Packet:          agtypes.CopyToIBCPacket(packet),
		Acknowledgement: acknowledgement,
		Relayer:         relayer,
	}

	err := k.PushAction(ctx, event)
	if err != nil {
		return err
	}

	return nil
}

func (k Keeper) TriggerOnTimeoutPacket(
	ctx sdk.Context,
	target string,
	packet ibcexported.PacketI,
	relayer sdk.AccAddress,
) error {
	event := types.TimeoutPacketEvent{
		Target:  target,
		Packet:  agtypes.CopyToIBCPacket(packet),
		Relayer: relayer,
	}

	err := k.PushAction(ctx, event)
	if err != nil {
		return err
	}

	return nil
}
