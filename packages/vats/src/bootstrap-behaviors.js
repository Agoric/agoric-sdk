// @ts-check
import { E } from '@agoric/far';
import { AssetKind } from '@agoric/ertp';

// TODO: phase out ./issuers.js
export const CENTRAL_ISSUER_NAME = 'RUN';

/** @type { FeeIssuerConfig } */
export const feeIssuerConfig = {
  name: CENTRAL_ISSUER_NAME,
  assetKind: AssetKind.NAT,
  displayInfo: { decimalPlaces: 6, assetKind: AssetKind.NAT },
};

export const bootstrapManifest = harden({
  // TODO: get rid of (redundant) behaviors. collapse manifest
  behaviors: {
    connectVattpWithMailbox: true,
    makeVatAdminService: true,
    buildZoe: true,
    makeBoard: true,
  },
  endowments: {
    connectVattpWithMailbox: {
      vatPowers: { D: true },
      vats: { vattp: true },
      devices: { mailbox: true },
    },
    makeVatAdminService: {
      vats: { vatAdmin: true },
      devices: { vatAdmin: true },
      workspace: true,
    },
    buildZoe: {
      workspace: true,
    },
    makeBoard: {
      workspace: { vatAdminSvc: true, allClients: true },
    },
  },
});

/**
 * @param {{
 *   vatPowers: { D: EProxy }, // D type is approximate
 *   vats: { vattp: VattpVat },
 *   devices: { mailbox: MailboxDevice },
 * }} powers
 */
const connectVattpWithMailbox = ({
  vatPowers: { D },
  vats: { vattp },
  devices: { mailbox },
}) => {
  D(mailbox).registerInboundHandler(vattp);
  return E(vattp).registerMailboxDevice(mailbox);
};

/**
 *
 * @param {{
 *   vats: { vatAdmin: VatAdminVat },
 *   devices: { vatAdmin: unknown },
 *   workspace: import('./bootstrap-core').PromiseSpace,
 * }} powers
 */
const makeVatAdminService = async ({ vats, devices, workspace }) => {
  workspace.vatAdminSvc = E(vats.vatAdmin).createVatAdminService(
    devices.vatAdmin,
  );
};

/**
 * @param {{
 *   workspace: Record<string, ERef<any>>,
 * }} powers
 *
 * @typedef {ERef<ReturnType<import('./vat-zoe').buildRootObject>>} ZoeVat
 */
const buildZoe = async ({ workspace }) => {
  const { vatAdminSvc } = workspace;
  /** @type {{ root: ZoeVat }} */
  const { root } = await E(vatAdminSvc).createVatByName('zoe');
  const { zoeService: zoe, feeMintAccess: _2 } = await E(root).buildZoe(
    vatAdminSvc,
    feeIssuerConfig,
  );

  workspace.zoe = zoe;
  E(workspace.allClients).assign({ zoe });
};

/**
 * @param {{
 *   workspace: { vatAdminSvc: VatAdminSvc, allClients: Record<string, unknown> }
 * }} powers
 */
const makeBoard = async ({ workspace: { vatAdminSvc, allClients } }) => {
  const { root } = await E(vatAdminSvc).createVatByName('board');

  const board = E(root).getBoard();
  E(allClients).assign({ board });
};

/* TODO
    agoricNames,
    namesByAddress,
    myAddressNameAdmin,
 */

harden({ connectVattpWithMailbox, makeVatAdminService, buildZoe, makeBoard });
export { connectVattpWithMailbox, makeVatAdminService, buildZoe, makeBoard };
