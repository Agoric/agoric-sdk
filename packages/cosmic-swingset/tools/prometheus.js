// https://prometheus.io/docs/instrumenting/exposition_formats/#text-based-format
// metric_name [
//   "{" label_name "=" `"` label_value `"` { "," label_name "=" `"` label_value `"` } [ "," ] "}"
// ] value [ timestamp ]
export const prometheusMetricNamePatt = '[a-zA-Z_:][a-zA-Z0-9_:]*';
export const prometheusLabelNamePatt = '[a-zA-Z_][a-zA-Z0-9_]*';
export const prometheusLabelPatt = String.raw`${prometheusLabelNamePatt}="(?:[^\\"\n]|\\(?:\\|"|n))*"`;
export const prometheusSamplePatt = String.raw`^((${prometheusMetricNamePatt})(?:[{]${prometheusLabelPatt}(?:,${prometheusLabelPatt})*,?[}])?) +(\S+)( +-?[0-9]+|)$`;

export const leadingPrometheusNameRegExp = RegExp(
  `^${prometheusMetricNamePatt}\\b`,
  'gmu',
);
export const prometheusSampleRegExp = RegExp(prometheusSamplePatt, 'gmu');

export const prometheusNumberValue = value => {
  if (value === 'NaN') return NaN;
  if (value === '+Inf') return Infinity;
  if (value === '-Inf') return -Infinity;
  const num = parseFloat(value);
  if (Number.isNaN(num)) {
    throw Error(`${value} is not a decimal value`);
  }
  return num;
};
