((($ENV.USD_PER_BLD | tonumber) * 1e12) | tostring) as $beansPerBLD |
{
  fee_unit_price: (.fee_unit_price |
    walk(if type == "object" and .denom then ({ denom: "ubld", amount: "1000000" }) else . end)
  ),
  beans_per_unit: (.beans_per_unit |
    [
      { key: "feeUnit", beans: $beansPerBLD },
      { key: "smartWalletProvision", beans: ($beansPerBLD + "0") }
    ] +
      map(select(.key != "feeUnit" and .key != "smartWalletProvision"))
  ),
} |
{
  "@type": "/cosmos.params.v1beta1.ParameterChangeProposal",
  title: $ENV.PROPOSAL_TITLE,
  description: $ENV.PROPOSAL_DESC,
  changes: (to_entries | map({ subspace: "swingset", key: .key, value: .value })),
}
