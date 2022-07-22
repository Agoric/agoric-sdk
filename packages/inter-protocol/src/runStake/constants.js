export const AttKW = /** @type { const } */ ({
  /** seat keyword for use in offers to return an attestation. */
  Attestation: 'Attestation',
});

export const ManagerKW = /** @type { const } */ ({
  [AttKW.Attestation]: AttKW.Attestation,
  Debt: 'Debt',
});

export const ParamKW = /** @type { const } */ ({
  DebtLimit: 'DebtLimit',
  MintingRatio: 'MintingRatio',
  InterestRate: 'InterestRate',
  LoanFee: 'LoanFee',
});
