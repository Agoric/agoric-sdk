import { BridgeId, VBankAccount } from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { fakeLocalChainBridgeTxMsgHandler } from '@agoric/vats/tools/fake-bridge.js';
import { Fail, q } from '@endo/errors';

type MockBridgeOptions = {
  ibcKit: { handleOutboundMessage: (msg: any) => unknown };
  outboundMessages: Map<BridgeId, any[]>;
  storageKit: import('@agoric/internal/src/storage-test-utils.js').FakeStorageKit;
};

type StorageMessage =
  import('@agoric/internal/src/lib-chainStorage.js').StorageMessage;

export const makeMockBridgeKit = ({
  ibcKit = { handleOutboundMessage: () => String(undefined) },
  outboundMessages = new Map(),
  storageKit = makeFakeStorageKit(''),
}: Partial<MockBridgeOptions> = {}) => {
  let lastBankNonce = 0;
  let lcaAccountsCreated = 0;
  let lcaSequenceNonce = 0;

  const handleBridgeSend = (
    destinationPort: BridgeId,
    obj: Record<string, any> & { type: string },
  ) => {
    if (!outboundMessages.has(destinationPort))
      outboundMessages.set(destinationPort, []);

    outboundMessages.get(destinationPort)!.push(obj);

    // `storageKit` handles the "storage" port.
    if (destinationPort === BridgeId.STORAGE)
      return storageKit.toStorage(obj as unknown as StorageMessage);

    // `ibcKit` handles the "IBC_METHOD" type for all ports.
    if (obj.type === 'IBC_METHOD') return ibcKit.handleOutboundMessage(obj);

    // All other sends are handled by port and type.
    const bridgeType = `${destinationPort}:${obj.type}`;
    switch (bridgeType) {
      case `${BridgeId.BANK}:VBANK_GET_BALANCE`:
        return '0';
      case `${BridgeId.BANK}:VBANK_GET_MODULE_ACCOUNT_ADDRESS`: {
        for (const { module, address } of Object.values(VBankAccount))
          if (module === obj.moduleName) return address;

        return String(undefined);
      }
      case `${BridgeId.BANK}:VBANK_GIVE`:
      case `${BridgeId.BANK}:VBANK_GRAB`: {
        lastBankNonce += 1;
        return harden({
          nonce: `${lastBankNonce}`,
          type: 'VBANK_BALANCE_UPDATE',
          updated: [],
        });
      }

      case `${BridgeId.VLOCALCHAIN}:VLOCALCHAIN_ALLOCATE_ADDRESS`: {
        const address = makeTestAddress(lcaAccountsCreated);
        lcaAccountsCreated += 1;
        return address;
      }
      case `${BridgeId.VLOCALCHAIN}:VLOCALCHAIN_EXECUTE_TX`: {
        lcaSequenceNonce += 1;
        return obj.messages.map(message =>
          fakeLocalChainBridgeTxMsgHandler(message, lcaSequenceNonce),
        );
      }
      default:
        Fail`bridge port ${q(destinationPort)} not implemented for message type ${q(obj.type)}`;
    }
  };

  return { handleBridgeSend, outboundMessages, storageKit };
};
