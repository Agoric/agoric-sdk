import {
  boardSlottingMarshaller,
  makeBoardRemote,
} from '@agoric/internal/src/marshal.js';
import { AmountMath } from '@agoric/ertp';
import { executeOffer, queryVstorage } from '@agoric/synthetic-chain';
import { makeSmartWalletKit, LOCAL_CONFIG } from '@agoric/client-utils';
import test from 'ava';

const AGORIC_WALLET_ADDRESS = 'agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q';

test.before('setup', async t => {
  const makeFromBoard = () => {
    const cache = new Map();
    /** @type {(boardId: string, iface?: string) => ReturnType<typeof makeBoardRemote>} */
    const convertSlotToVal = (boardId, iface) => {
      if (cache.has(boardId)) {
        return cache.get(boardId);
      }
      const val = makeBoardRemote({ boardId, iface });
      cache.set(boardId, val);
      return val;
    };
    return harden({ convertSlotToVal });
  };
  const fromBoard = makeFromBoard();
  const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);

  const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));
  const smartWalletKit = await makeSmartWalletKit(
    { delay, fetch },
    LOCAL_CONFIG,
  );
  t.context = {
    marshaller,
    smartWalletKit,
  };
});

test.serial('should open a new portfolio', async t => {
  const { marshaller, smartWalletKit } = t.context;

  const brands = await queryVstorage('published.agoricNames.brand');
  const a1 = JSON.parse(brands.value);
  console.log(a1);

  const a2 = marshaller.fromCapData(JSON.parse(a1.values[0]));

  const bldBrand = Object.fromEntries(a2).BLD;
  const swapInAmount = AmountMath.make(bldBrand, 1250n);
  const swapInAmount2 = AmountMath.make(bldBrand, 10n);

  const id = Date.now().toString();
  const data = async () => {
    const body = {
      method: 'executeOffer',
      offer: {
        id,
        invitationSpec: {
          instancePath: ['ymax0'],
          callPipe: [['makeOpenPortfolioInvitation']],
          source: 'agoricContract',
        },
        offerArgs: {
          destinationEVMChain: 'Ethereum',
          Aave: { acctRatio: [1n, 2n], gmpRatio: [1n, 2n] },
        },
        proposal: {
          give: {
            Aave: swapInAmount2,
            AaveGmp: swapInAmount,
            AaveAccount: swapInAmount,
          },
        },
      },
    };

    const capData = marshaller.toCapData(harden(body));
    return JSON.stringify(capData);
  };
  await executeOffer(AGORIC_WALLET_ADDRESS, data());

  const walletRecord = await smartWalletKit.getCurrentWalletRecord(
    AGORIC_WALLET_ADDRESS,
  );

  const openPortfolioInvitation = walletRecord.offerToUsedInvitation.find(
    inv => inv[1].value[0].description === 'openPortfolio',
  );
  t.truthy(openPortfolioInvitation, 'Open portfolio invitation should exist');
});

