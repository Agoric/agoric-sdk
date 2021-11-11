/* eslint-disable import/no-extraneous-dependencies */
import { stringifyPurseValue } from '@agoric/ui-components';
import { mount } from 'enzyme';
import Chip from '@material-ui/core/Chip';
import Offer from '../Offer';
import { formatDateNow } from '../../util/Date';

jest.mock('@agoric/ui-components', () => ({
  stringifyPurseValue: ({ value, displayInfo }) =>
    `${value} ${displayInfo?.assetKind} ${displayInfo?.decimalPlaces}`,
}));

jest.mock('../../util/Date', () => ({ formatDateNow: stamp => stamp }));

const offer = {
  status: 'proposed',
  instancePetname: ['TokenPalace', 'Installation'],
  instanceHandleBoardId: '123',
  requestContext: {
    date: 1636614038901,
    dappOrigin: 'https://tokenpalace.app',
    origin: 'unknown origin',
  },
  proposalForDisplay: {
    give: {
      Collateral: {
        amount: {
          brand: { kind: 'brand', petname: 'PAL' },
          displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
          value: 1000000n,
        },
        pursePetname: 'Palace Token',
      },
    },
    want: {
      RUN: {
        amount: {
          brand: { kind: 'brand', petname: 'RUN' },
          displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
          value: 18544198n,
        },
        pursePetname: 'Zoe fees',
      },
    },
  },
  invitationDetails: {
    fee: {
      value: 5000000n,
      brand: { kind: 'brand', petname: 'RUN' },
      displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
    },
    feePursePetname: 'Zoe fees',
    expiry: 1723014088n,
  },
};

test('renders the gives', () => {
  const component = mount(<Offer offer={offer} />);

  const give = component.find('.OfferEntry').at(0);

  expect(give.text()).toContain('Give Collateral');
  expect(give.text()).toContain(
    stringifyPurseValue({
      value: offer.proposalForDisplay.give.Collateral.amount.value,
      displayInfo: offer.proposalForDisplay.give.Collateral.amount.displayInfo,
    }),
  );
  expect(give.text()).toContain('from Palace Token');
});

test('renders the wants', () => {
  const component = mount(<Offer offer={offer} />);

  const want = component.find('.OfferEntry').at(1);

  expect(want.text()).toContain('Want RUN');
  expect(want.text()).toContain(
    stringifyPurseValue({
      value: offer.proposalForDisplay.want.RUN.amount.value,
      displayInfo: offer.proposalForDisplay.want.RUN.amount.displayInfo,
    }),
  );
  expect(want.text()).toContain('into Zoe fees');
});

test('renders the fee', () => {
  const component = mount(<Offer offer={offer} />);

  const fee = component.find('.OfferEntry').at(2);

  expect(fee.text()).toContain('Pay Fee');
  expect(fee.text()).toContain(
    stringifyPurseValue({
      value: offer.invitationDetails.fee.value,
      displayInfo: offer.invitationDetails.fee.displayInfo,
    }),
  );
  expect(fee.text()).toContain('from Zoe fees');
});

test('renders the expiry', () => {
  const component = mount(<Offer offer={offer} />);

  const expiry = component.find('.OfferEntry').at(3);

  expect(expiry.text()).toContain('Expiry');
  expect(expiry.text()).toContain(
    formatDateNow(offer.invitationDetails.expiry),
  );
});

test('renders the timestamp', () => {
  const component = mount(<Offer offer={offer} />);

  expect(component.find('.Date').text()).toContain(
    formatDateNow(offer.requestContext.date),
  );
});

test('renders the controls', () => {
  const component = mount(<Offer offer={offer} />);

  const controls = component.find('.Controls');

  expect(
    controls
      .find(Chip)
      .at(0)
      .text(),
  ).toContain('Accept');
  expect(
    controls
      .find(Chip)
      .at(1)
      .text(),
  ).toContain('Decline');
});

test('renders the cancel button while pending', () => {
  const pendingOffer = { ...offer };
  pendingOffer.status = 'pending';

  const component = mount(<Offer offer={pendingOffer} />);

  expect(
    component
      .find(Chip)
      .at(0)
      .text(),
  ).toContain('Pending');
  expect(
    component
      .find('.Controls')
      .find(Chip)
      .text(),
  ).toContain('Cancel');
});

test('renders the accepted state', () => {
  const acceptedOffer = { ...offer };
  acceptedOffer.status = 'accept';

  const component = mount(<Offer offer={acceptedOffer} />);

  expect(
    component
      .find(Chip)
      .at(0)
      .text(),
  ).toContain('Accepted');
  expect(component.find('.Controls').find(Chip)).toHaveLength(0);
});

test('renders the dapp origin', () => {
  const component = mount(<Offer offer={offer} />);

  expect(component.find('.OfferOrigin').text()).toContain(
    'TokenPalace.Installation via https://tokenpalace.app',
  );
});
