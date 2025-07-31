
export const makePlanner = (
    wallet: WalletTool,
    instance: Instance<typeof start>,
    readPublished: VstorageKit['readPublished'],
  ) => {};
  
  export const makeResolver = (
    wallet: WalletTool,
    instance: Instance<typeof start>,
    readPublished: VstorageKit['readPublished'],
  ) => {
    const redeem = async () => {
      await wallet.executePublicOffer({
        id: 'redeemInvitation',
        invitationSpec: {
          source: 'purse',
          description: 'admin',
          instance: walletFun,
        },
        proposal: {},
        after: { saveAs: 'priceSetter' },
      });
    };
  };
  