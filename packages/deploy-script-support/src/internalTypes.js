/**
 * @callback MakeInstallSaveAndPublish
 * @param {BundleSource} bundleSource
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<InstallationManager>} installationManager
 * @param {ERef<Board>} board
 * @returns {InstallSaveAndPublish}
 */

// TODO: import this from agoric-cli

/**
 * @typedef {(...pathSegments: string[]) => string} AttenuatedPathResolve
 */

/**
 * @callback MakeResolvePaths
 * @param {AttenuatedPathResolve} pathResolve
 * @param {RequireResolve} requireResolve
 * @returns {{ resolvePathForLocalContract: ResolvePathForLocalContract
    resolvePathForPackagedContract: ResolvePathForPackagedContract }}
 */

/**
 * @callback MakeStartInstanceAndSave
 * @param {ERef<IssuerManager>} issuerManager
 * @param {ERef<InstanceManager>} instanceManager
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<Purse>} zoeInvitationPurse
 * @returns {StartInstanceAndSave}
 */

/**
 * @callback MakeOfferAndFindInvitationAmount
 * @param {ERef<WalletAdminFacet>} walletAdmin - an internal type of the
 * wallet, not defined here
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<Purse>} zoeInvitationPurse
 * @returns {{ offer: OfferHelper, findInvitationAmount: FindInvitationAmount }}
 */

/**
 * @callback MakeSaveIssuerHelper
 * @param {ERef<WalletAdminFacet>} walletAdmin - an internal type of the
 * wallet, not defined here
 * @param {ERef<IssuerManager>} issuerManager
 * @returns {SaveIssuerHelper}
 */

/**
 * @callback MakeDepositInvitation
 * @param {ERef<Purse>} zoeInvitationPurse
 * @returns {DepositInvitation}
 */
