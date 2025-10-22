import tsBlankSpace from 'ts-blank-space';

export async function load(url, context, nextLoad) {
  if (!url.endsWith('.ts') && !url.endsWith('.mts')) {
    return nextLoad(url, context);
  }

  if (url.indexOf('/node_modules/') > 0) {
    throw Error(
      `Stripping types is currently unsupported for files under node_modules, for "${url}"`,
    );
  }

  const format = 'module';
  const result = await nextLoad(url, { ...context, format });
  const transformedSource = tsBlankSpace(result.source.toString());

  return {
    format,
    shortCircuit: true,
    source: transformedSource + '\n//# sourceURL=' + url,
  };
}
