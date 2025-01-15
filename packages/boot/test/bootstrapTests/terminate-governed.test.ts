import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import path from 'path';
import bundleSource from '@endo/bundle-source';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { MALLEABLE_NUMBER } from '@agoric/governance/test/swingsetTests/contractGovernor/governedContract.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '@agoric/vats/tools/board-utils.js';

import { makeSwingsetTestKit } from '../../tools/supports.js';
import {
    makeGovernanceDriver,
    makeWalletFactoryDriver,
} from '../../tools/drivers.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const GOVERNED_CONTRACT_SRC = '../../../governance/test/swingsetTests/contractGovernor/governedContract.js';

const setUpGovernedContract = async (zoe, timer, EV, controller) => {
    const installBundle = contractBundle => EV(zoe).install(contractBundle);
    //const installBundleToVatAdmin = contractBundle =>
    //    controller.validateAndInstallBundle(contractBundle);
    const source = `${dirname}/${GOVERNED_CONTRACT_SRC}`;
    const governedContractBundle = await bundleSource(source);

    const agoricNames = await EV.vat('bootstrap').consumeItem('agoricNames');
    const governorInstallation = await EV(agoricNames).lookup(
        'installation',
        'contractGovernor',
    );
    const voteCounterInstallation = await EV(agoricNames).lookup(
        'installation',
        'binaryVoteCounter',
    );

    const electorateCreatorFacet = await EV.vat('bootstrap').consumeItem(
        'economicCommitteeCreatorFacet',
    );
    const poserInvitation = await EV(electorateCreatorFacet).getPoserInvitation();
    const poserInvitation2 = await EV(
        electorateCreatorFacet,
    ).getPoserInvitation();

    const invitationIssuer = await EV(zoe).getInvitationIssuer();
    const invitationAmount =
        await EV(invitationIssuer).getAmountOf(poserInvitation);

    const governedTerms = {
        governedParams: {
            [MALLEABLE_NUMBER]: {
                type: ParamTypes.NAT,
                value: 602214090000000000000000n,
            },
            [CONTRACT_ELECTORATE]: {
                type: ParamTypes.INVITATION,
                value: invitationAmount,
            },
        },
    };

    const governedInstallation = await installBundle(governedContractBundle);
    const governorTerms = {
        timer,
        governedContractInstallation: governedInstallation,
        governed: {
            terms: governedTerms,
            issuerKeywordRecord: {},
        },
    };

    const governorFacets = await EV(zoe).startInstance(
        governorInstallation,
        {},
        governorTerms,
        {
            governed: {
                initialPoserInvitation: poserInvitation,
            },
        },
    );

    return {
        governorFacets,
        invitationAmount,
        voteCounterInstallation,
        poserInvitation2,
    };
};

// A more minimal set would be better. We need governance, but not econ vats.
const PLATFORM_CONFIG = '@agoric/vm-config/decentral-main-vaults-config.json';

const makeDefaultTestContext = async t => {
    console.time('DefaultTestContext');
    const swingsetTestKit = await makeSwingsetTestKit(t.log, undefined, {
        configSpecifier: PLATFORM_CONFIG,
    });

    const { runUtils, storage, controller } = swingsetTestKit;
    console.timeLog('DefaultTestContext', 'swingsetTestKit');
    const { EV } = runUtils;
    const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');
    const timer = await EV.vat('bootstrap').consumeItem('chainTimerService');

    // has to be late enough for agoricNames data to have been published
    const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);

    const walletFactoryDriver = await makeWalletFactoryDriver(
        runUtils,
        storage,
        agoricNamesRemotes,
    );

    const governanceDriver = await makeGovernanceDriver(
        swingsetTestKit,
        agoricNamesRemotes,
        walletFactoryDriver,
        [],
    );

    const facets = await setUpGovernedContract(zoe, timer, EV, controller);

    return { ...swingsetTestKit, facets, governanceDriver };
};

const test = anyTest as TestFn<
    Awaited<ReturnType<typeof makeDefaultTestContext>>
>;

test.before(async t => {
    t.context = await makeDefaultTestContext(t);
});

test.after.always(t => {
    return t.context.shutdown && t.context.shutdown();
});

/*
test(`start contract; verify`, async t => {
    const { runUtils, facets } = t.context;
    const {
        governorFacets: { creatorFacet },
    } = facets;
    const { EV } = runUtils;
    const contractPublicFacet = await EV(creatorFacet).getPublicFacet();

    const avogadro = await EV(contractPublicFacet).getNum();
    t.is(await EV(contractPublicFacet).getApiCalled(), 0);
    t.is(avogadro, 602214090000000000000000n);
});
*/

test(`Create a contract and acquire a boardId`, async t => {
    const { runUtils, facets, governanceDriver, storage } = t.context;
    const {
        governorFacets: { creatorFacet, instance, adminFacet }, // this is governor's adminFacet
        voteCounterInstallation: vci,
    } = facets;

    const { EV } = runUtils;
    const contractPublicFacet = await EV(creatorFacet).getPublicFacet();

    // set a cookie value in the contract
    const avogadro = await EV(contractPublicFacet).getNum();
    t.is(await EV(contractPublicFacet).getApiCalled(), 0);
    t.is(avogadro, 602214090000000000000000n);

    //const committee = governanceDriver.ecMembers;

    const agoricNamesAdmin =
        await EV.vat('bootstrap').consumeItem('agoricNamesAdmin');
    // await EV(agoricNamesAdmin).reserve('governedContract');
    const instanceAdmin = await EV(agoricNamesAdmin).lookupAdmin('instance');
    console.log('UPGA ', { instanceAdmin });
    await EV(instanceAdmin).update('governedContract', instance);
    const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);

    const { governedContract } = agoricNamesRemotes.instance;
    //const board = await EV.vat('bootstrap').consumeItem('board');
    const boardId = await governedContract.getBoardId();

    console.log({ boardId });
    // t.context.boardId = boardId;

    // verify the contract works and the cookie matches
    const num = await EV(contractPublicFacet).getNum();
    t.is(num, 602214090000000000000000n);

    // terminate -- replace with a coreEval
    console.log({ adminFacet });
    const contractAdminFacet = await EV(creatorFacet).getAdminFacet();
    await EV(contractAdminFacet).terminateContract(Error('Reasons'));

    // confirm the contract is no longer there
    await t.throwsAsync(
        () => EV(contractPublicFacet).getNum(),
        {
            message: 'vat terminated',
        }
    );
});