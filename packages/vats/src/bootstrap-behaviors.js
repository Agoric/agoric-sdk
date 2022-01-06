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
  behaviors: {
    connectVattpWithMailbox: true,
    buildZoe: true,
  },
  endowments: {
    connectVattpWithMailbox: {
      vatPowers: { D: true },
      vats: { vattp: true },
      devices: { mailbox: true },
    },
    buildZoe: {
      vats: { vatAdmin: true },
      devices: { vatAdmin: true },
      workspace: true,
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
 * @param {{
 *   vats: { vatAdmin: VatAdminVat },
 *   devices: { vatAdmin: unknown },
 *   workspace: Record<string, ERef<any>>,
 * }} powers
 *
 * @typedef {ERef<ReturnType<import('./vat-zoe').buildRootObject>>} ZoeVat
 */
const buildZoe = async ({ vats, devices, workspace }) => {
  // TODO: what else do we need vatAdminSvc for? can we let it go out of scope?
  const vatAdminSvc = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);

  /** @type {{ root: ZoeVat }} */
  const { root } = await E(vatAdminSvc).createVatByName('zoe');
  const { zoeService: zoe, feeMintAccess: _2 } = await E(root).buildZoe(
    vatAdminSvc,
    feeIssuerConfig,
  );

  workspace.zoe = zoe;
  E(workspace.allClients).assign({ zoe });
};

harden({ connectVattpWithMailbox, buildZoe });
export { connectVattpWithMailbox, buildZoe };
