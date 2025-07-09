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

export const makeMockBridgeKit = ({
  ibcKit,
  outboundMessages = new Map(),
  storageKit = makeFakeStorageKit(''),
}: Partial<MockBridgeOptions> = {}) => {
  let lastBankNonce = 0;
  let lcaAccountsCreated = 0;
  let lcaSequenceNonce = 0;

  const handleBridgeSend = (bridgeId: BridgeId, obj: any) => {
    if (!outboundMessages.has(bridgeId)) outboundMessages.set(bridgeId, []);

    outboundMessages.get(bridgeId)!.push(obj);

    // `storageKit` handles the "storage" port.
    if (bridgeId === BridgeId.STORAGE) return storageKit!.toStorage(obj);

    // `ibcKit` handles the "IBC_METHOD" type for all ports.
    if (obj.type === 'IBC_METHOD') return ibcKit!.handleOutboundMessage(obj);

    const bridgeType = `${bridgeId}:${obj.type}`;

    // All other sends are handled by port and type.
    switch (bridgeType) {
      case `${BridgeId.BANK}:VBANK_GET_BALANCE`:
        return '0';
      case `${BridgeId.BANK}:VBANK_GET_MODULE_ACCOUNT_ADDRESS`: {
        const { moduleName } = obj;
        const moduleDescriptor = Object.values(VBankAccount).find(
          ({ module }) => module === moduleName,
        );

        if (moduleDescriptor) return moduleDescriptor.address;
        else break;
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
        Fail`bridge port ${q(bridgeId)} not implemented for message type ${q(obj.type)}`;
    }

    return String(undefined);
  };

  return { handleBridgeSend, outboundMessages, storageKit };
};
