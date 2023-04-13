// enough to do Buffer.from(value, 'base64').toString()
export const Buffer = {
  from: (value, kind) => {
    if (kind !== 'base64') throw Error('not impl');
    const bytes = Utilities.base64DecodeWebSafe(value);
    return {
      toString: () => Utilities.newBlob(bytes).getDataAsString(),
    };
  },
};
