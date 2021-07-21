// @ts-check

import { makeScalarWeakMap } from '@agoric/store';

export const makeInstanceAdminStorage = () => {
  /** @type {StoreWeakMap<Instance,InstanceAdmin>} */
  const instanceToInstanceAdmin = makeScalarWeakMap('instance');

  /** @type {GetPublicFacet} */
  const getPublicFacet = instance =>
    instanceToInstanceAdmin.get(instance).getPublicFacet();

  /** @type {GetBrands} */
  const getBrands = instance =>
    instanceToInstanceAdmin.get(instance).getBrands();

  /** @type {GetIssuers} */
  const getIssuers = instance =>
    instanceToInstanceAdmin.get(instance).getIssuers();

  /** @type {GetTerms} */
  const getTerms = instance => instanceToInstanceAdmin.get(instance).getTerms();

  return harden({
    getPublicFacet,
    getBrands,
    getIssuers,
    getTerms,
    getInstanceAdmin: instanceToInstanceAdmin.get,
    initInstanceAdmin: instanceToInstanceAdmin.init,
    deleteInstanceAdmin: instanceToInstanceAdmin.delete,
  });
};
