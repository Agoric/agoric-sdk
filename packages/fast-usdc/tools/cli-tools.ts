export const flags = (
  record: Record<string, string | number | bigint | undefined>,
): string[] => {
  // @ts-expect-error undefined is filtered out
  const skipUndef: [string, string][] = Object.entries(record).filter(
    ([_k, v]) => v !== undefined,
  );
  return skipUndef.map(([k, v]) => [`--${k}`, `${v}`]).flat();
};
