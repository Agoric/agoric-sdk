type CopyRecord<T> = import('@endo/pass-style').CopyRecord<T>;

// export type {ContractMeta} from '@agoric/zoe/src/contractFacet/types-ambient';
export type ContractMeta = {
  customTermsShape?: CopyRecord<any> | undefined;
  privateArgsShape?: CopyRecord<any> | undefined;
  upgradability?: 'none' | 'canBeUpgraded' | 'canUpgrade' | undefined;
};
