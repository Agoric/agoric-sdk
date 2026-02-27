import { fromBech32, toHex } from '@cosmjs/encoding';
import type { EncodeObject, GeneratedType } from '@cosmjs/proto-signing';
import { Registry } from '@cosmjs/proto-signing';
import { defaultRegistryTypes } from '@cosmjs/stargate';
import type { DeliverTxResponse } from '@cosmjs/stargate';
import {
  MsgInstallBundle,
  MsgInstallBundleResponse,
  MsgSendChunk,
} from '@agoric/cosmic-proto/codegen/agoric/swingset/msgs.js';
import type {
  ChunkedArtifact,
  ChunkInfo,
} from '@agoric/cosmic-proto/codegen/agoric/swingset/swingset.js';

export interface BundleJson {
  moduleFormat: 'endoZipBase64';
  endoZipBase64: string;
  endoZipBase64Sha512: string;
  [key: string]: unknown;
}

export type Sha512 = (bytes: Uint8Array) => Promise<Uint8Array>;
export type Gzip = (bytes: Uint8Array) => Promise<Uint8Array>;

export const bundleRegistryTypes: [string, GeneratedType][] = [
  [MsgInstallBundle.typeUrl, MsgInstallBundle as GeneratedType],
  [MsgSendChunk.typeUrl, MsgSendChunk as GeneratedType],
];

export const makeBundleRegistry = (
  baseTypes: readonly [string, GeneratedType][] = defaultRegistryTypes,
) => new Registry([...baseTypes, ...bundleRegistryTypes]);

export const encodeBundle = (bundleJson: string) =>
  new TextEncoder().encode(bundleJson);

export const defaultSha512: Sha512 = async bytes => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('crypto.subtle is required; provide a sha512 function');
  }
  const digest = await subtle.digest('SHA-512', bytes as BufferSource);
  return new Uint8Array(digest);
};

export const getSha512Hex = async (
  bytes: Uint8Array,
  { sha512 = defaultSha512 }: { sha512?: Sha512 } = {},
) => {
  const digest = await sha512(bytes);
  return toHex(digest);
};

export const validateBundleJson = (bundleString: string): BundleJson => {
  let bundleObject: BundleJson;
  try {
    bundleObject = JSON.parse(bundleString) as BundleJson;
  } catch (error) {
    throw new Error(
      `The submitted file is not in the expected format, not parsable as JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const { moduleFormat, endoZipBase64, endoZipBase64Sha512 } = bundleObject;
  if (moduleFormat !== 'endoZipBase64') {
    throw new Error(
      `The submitted file does not have the expected moduleFormat value of endoZipBase64, got: ${moduleFormat}`,
    );
  }
  if (typeof endoZipBase64 !== 'string') {
    throw new Error(
      'The submitted file does not have the expected endoZipBase64 property',
    );
  }
  if (typeof endoZipBase64Sha512 !== 'string') {
    throw new Error(
      'The submitted file does not have the expected endoZipBase64Sha512 property',
    );
  }
  return bundleObject;
};

export const chunkBundle = async (
  bytes: Uint8Array,
  chunkSizeLimit: number,
  { sha512 = defaultSha512 }: { sha512?: Sha512 } = {},
) => {
  if (!Number.isSafeInteger(chunkSizeLimit) || chunkSizeLimit <= 0) {
    throw new Error(
      `chunkSizeLimit must be a positive safe integer, got ${chunkSizeLimit}`,
    );
  }

  const bundleSha512Hex = await getSha512Hex(bytes, { sha512 });

  const chunks: Uint8Array[] = [];
  const info: ChunkInfo[] = [];
  for (let i = 0; i < bytes.byteLength; i += chunkSizeLimit) {
    const chunk = bytes.subarray(
      i,
      Math.min(bytes.byteLength, i + chunkSizeLimit),
    );
    const chunkSha512Hex = await getSha512Hex(chunk, { sha512 });
    chunks.push(chunk);
    info.push({
      sha512: chunkSha512Hex,
      sizeBytes: BigInt(chunk.byteLength),
      state: 0,
    });
  }

  return {
    chunks,
    manifest: {
      sha512: bundleSha512Hex,
      sizeBytes: BigInt(bytes.byteLength),
      chunks: info,
    } satisfies ChunkedArtifact,
  };
};

export interface MsgInstallArgs {
  uncompressedSize: bigint;
  compressedBundle?: Uint8Array;
  chunkedArtifact?: ChunkedArtifact;
  submitter: string;
}

export const makeInstallBundleMsg = ({
  compressedBundle,
  uncompressedSize,
  chunkedArtifact,
  submitter,
}: MsgInstallArgs): EncodeObject => ({
  typeUrl: MsgInstallBundle.typeUrl,
  value: {
    uncompressedSize,
    submitter: fromBech32(submitter).data,
    ...(compressedBundle ? { compressedBundle } : {}),
    ...(chunkedArtifact ? { chunkedArtifact } : {}),
  },
});

export interface MsgSendChunkArgs {
  chunkedArtifactId: bigint;
  chunkIndex: bigint;
  chunkData: Uint8Array;
  submitter: string;
}

export const makeSendChunkMsg = ({
  chunkedArtifactId,
  chunkIndex,
  chunkData,
  submitter,
}: MsgSendChunkArgs): EncodeObject => ({
  typeUrl: MsgSendChunk.typeUrl,
  value: {
    chunkedArtifactId,
    chunkIndex,
    chunkData,
    submitter: fromBech32(submitter).data,
  },
});

export type InstallBundleProgress =
  | {
      type: 'preflight';
      bundleHash: string;
      uncompressedSize: number;
      compressedSize: number;
      chunked: boolean;
      chunkCount?: number;
    }
  | { type: 'bundle-submitted'; bundleHash: string; height: number }
  | {
      type: 'manifest-submitted';
      bundleHash: string;
      height: number;
      chunkCount: number;
      chunkedArtifactId: bigint;
    }
  | {
      type: 'chunk-submitted';
      bundleHash: string;
      height: number;
      index: number;
      total: number;
    }
  | { type: 'watching'; bundleHash: string; height: number };

export interface InstallBundleParams {
  bundleJson: string;
  chunkSizeLimit: number;
  submitter: string;
  gzip: Gzip;
  signAndBroadcast: (
    msg: EncodeObject,
  ) => Promise<DeliverTxResponse | undefined>;
  sha512?: Sha512;
  makeInstallBundleMsg?: (args: MsgInstallArgs) => EncodeObject;
  makeSendChunkMsg?: (args: MsgSendChunkArgs) => EncodeObject;
  watchBundle?: (bundleHash: string, height: number) => Promise<void>;
  onProgress?: (event: InstallBundleProgress) => void;
}

export interface InstallBundleResult {
  bundleHash: string;
  blockHeight: number;
  chunked: boolean;
  chunkCount?: number;
  compressedSize: number;
  uncompressedSize: number;
  chunkedArtifactId?: bigint;
}

export const installBundle = async (
  params: InstallBundleParams,
): Promise<InstallBundleResult> => {
  const {
    bundleJson,
    chunkSizeLimit,
    submitter,
    gzip,
    signAndBroadcast,
    sha512,
    makeInstallBundleMsg: makeInstallBundleMsgParam = makeInstallBundleMsg,
    makeSendChunkMsg: makeSendChunkMsgParam = makeSendChunkMsg,
    watchBundle,
    onProgress,
  } = params;

  const bundleObject = validateBundleJson(bundleJson);
  const { endoZipBase64Sha512 } = bundleObject;

  const uncompressedBundleBytes = encodeBundle(bundleJson);
  const compressedBundleBytes = await gzip(uncompressedBundleBytes);
  const compressedSize = compressedBundleBytes.byteLength;
  const uncompressedSize = uncompressedBundleBytes.byteLength;

  const shouldChunk = compressedBundleBytes.byteLength > chunkSizeLimit;
  onProgress?.({
    type: 'preflight',
    bundleHash: endoZipBase64Sha512,
    uncompressedSize,
    compressedSize,
    chunked: shouldChunk,
    chunkCount: shouldChunk
      ? Math.ceil(compressedBundleBytes.byteLength / chunkSizeLimit)
      : undefined,
  });

  let blockHeight: number | undefined;
  let chunkedArtifactId: bigint | undefined;

  if (!shouldChunk) {
    const txMsg = makeInstallBundleMsgParam({
      compressedBundle: compressedBundleBytes,
      uncompressedSize: BigInt(uncompressedSize),
      submitter,
    });
    try {
      const txResponse = await signAndBroadcast(txMsg);
      if (!txResponse) {
        throw new Error('no response for bundle');
      }
      blockHeight = txResponse.height;
      onProgress?.({
        type: 'bundle-submitted',
        bundleHash: endoZipBase64Sha512,
        height: blockHeight,
      });
    } catch (error) {
      throw new Error(
        `Transaction failed to submit bundle to chain: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  } else {
    const { chunks, manifest } = await chunkBundle(
      compressedBundleBytes,
      chunkSizeLimit,
      { sha512 },
    );

    const txMsg = makeInstallBundleMsgParam({
      uncompressedSize: BigInt(uncompressedSize),
      submitter,
      chunkedArtifact: manifest,
    });
    try {
      const txResponse = await signAndBroadcast(txMsg);
      if (!txResponse) {
        throw new Error(
          `No transaction response for attempt to submit manifest for bundle ${endoZipBase64Sha512}`,
        );
      }
      blockHeight = txResponse.height;
      const installBundleResponse = txResponse.msgResponses.find(
        response => response.typeUrl === MsgInstallBundleResponse.typeUrl,
      );
      if (!installBundleResponse) {
        throw new Error(
          `No install bundle response found in manifest submission transaction response for bundle ${endoZipBase64Sha512}. This is a software defect. Please report.`,
        );
      }
      const { chunkedArtifactId: decodedChunkedArtifactId } =
        MsgInstallBundleResponse.decode(installBundleResponse.value) as {
          chunkedArtifactId?: bigint | number | null;
        };
      if (
        decodedChunkedArtifactId === null ||
        decodedChunkedArtifactId === undefined ||
        decodedChunkedArtifactId === 0n ||
        decodedChunkedArtifactId === 0
      ) {
        throw new Error(
          `No chunked artifact identifier found in manifest submission transaction response for bundle ${endoZipBase64Sha512}. This is a software defect. Please report.`,
        );
      }
      chunkedArtifactId = BigInt(decodedChunkedArtifactId);
      onProgress?.({
        type: 'manifest-submitted',
        bundleHash: endoZipBase64Sha512,
        height: blockHeight,
        chunkCount: chunks.length,
        chunkedArtifactId,
      });
    } catch (error) {
      throw new Error(
        `Transaction failed to submit bundle manifest to chain for bundle ${endoZipBase64Sha512}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (chunkedArtifactId === undefined || chunkedArtifactId === 0n) {
      throw new Error(
        `No chunked artifact identifier found in manifest submission transaction response for bundle ${endoZipBase64Sha512}. This is a software defect. Please report.`,
      );
    }
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      const chunkMsg = makeSendChunkMsgParam({
        chunkedArtifactId,
        chunkIndex: BigInt(i),
        chunkData: chunk,
        submitter,
      });
      try {
        const txResponse = await signAndBroadcast(chunkMsg);
        if (!txResponse) {
          throw new Error('no transaction response');
        }
        blockHeight = txResponse.height;
        onProgress?.({
          type: 'chunk-submitted',
          bundleHash: endoZipBase64Sha512,
          height: blockHeight,
          index: i,
          total: chunks.length,
        });
      } catch (error) {
        throw new Error(
          `Transaction failed to submit bundle chunk ${i} of bundle ${endoZipBase64Sha512} to chain: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  if (blockHeight === undefined) {
    throw new Error(
      'Bundle submitted but transaction response did not provide a block height. This should not occur. Please report.',
    );
  }

  onProgress?.({
    type: 'watching',
    bundleHash: endoZipBase64Sha512,
    height: blockHeight,
  });
  if (watchBundle) {
    await watchBundle(endoZipBase64Sha512, blockHeight);
  }

  return {
    bundleHash: endoZipBase64Sha512,
    blockHeight,
    chunked: shouldChunk,
    chunkCount: shouldChunk
      ? Math.ceil(compressedBundleBytes.byteLength / chunkSizeLimit)
      : undefined,
    compressedSize,
    uncompressedSize,
    chunkedArtifactId,
  };
};
