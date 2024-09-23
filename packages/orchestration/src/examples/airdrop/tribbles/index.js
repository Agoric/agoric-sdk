/* eslint-disable no-shadow */
import { sha256 } from '../../vendor/@noble/hashes/esm/sha256.js';
import { bytesToHex } from '../../vendor/@noble/hashes/esm/utils.js';
import { compose } from '../airdrop/helpers/objectTools.js';

const LEFT = 'left';
const RIGHT = 'right';

/**
 * @typedef {string} PublicKeyHash - A SHA-256 hash of a public key, represented as a hexadecimal string.
 */

/**
 * An array of SHA-256 hashes, each computed against a different cryptocurrency public key.
 * @typedef {PublicKeyHash[]} PubkeyHashArray
 */

/**
 * Computes the SHA-256 hash of a Uint8Array and encodes it as a hexadecimal string.
 *
 * @param {Uint8Array} data - The input Uint8Array to hash.
 * @returns {string} The hexadecimal representation of the SHA-256 hash of the input data.
 */
export const computeHexEncodedSha256Hash = compose(
  // trace('after bytesToHex'),
  bytesToHex,
  // trace('after hashing'),
  sha256,
);

/**
 * @typedef {object} Node
 * @property {string} hash
 * @property {string} direction
 */

/**
 * Finds the index of the hash in the leaf hash list of the Merkle tree
 * and verifies if it's a left or right child by checking if its index is
 * even or odd. If the index is even, then it's a left child, if it's odd,
 * then it's a right child.
 * @param {string} hash
 * @param {Array<Array<string>>} merkleTree
 * @returns {string} direction
 */
const getLeafNodeDirectionInMerkleTree = (hash, merkleTree) => {
  const hashIndex = merkleTree[0].findIndex(h => h === hash);
  return hashIndex % 2 === 0 ? LEFT : RIGHT;
};

/**
 * If the hashes length is not even, then it copies the last hashes and adds it to the
 * end of the array, so it can be hashed with itself.
 * @param {PubkeyHashArray} hashes
 */
const ensureEven = hashes =>
  hashes.length % 2 !== 0 && hashes.push(hashes[hashes.length - 1]);

/**
 * Generates the merkle root of the hashes passed through the parameter.
 * Recursively concatenates pair of hash hashes and calculates each sha256 hash of the
 * concatenated hashes until only one hash is left, which is the merkle root, and returns it.
 * @param {PubkeyHashArray} hashes
 * @returns {string} merkleRoot
 */
const generateMerkleRoot = hashes => {
  if (!hashes || hashes.length === 0) {
    return '';
  }
  ensureEven(hashes);
  const combinedHashes = [];
  for (let i = 0; i < hashes.length; i += 2) {
    const hashPairConcatenated = hashes[i] + hashes[i + 1];
    const hash = computeHexEncodedSha256Hash(hashPairConcatenated);
    combinedHashes.push(hash);
  }
  // If the combinedHashes length is 1, it means that we have the merkle root already
  // and we can return
  if (combinedHashes.length === 1) {
    return combinedHashes.join('');
  }
  return generateMerkleRoot(combinedHashes);
};

const createHash = fn => (h1, h2) => ({ hash: fn(h2 + h1) });
const createSha256HashObj = createHash(computeHexEncodedSha256Hash);

const computeProofReducer = ({ hash: h1 }, { hash: h2, direction }) =>
  direction === RIGHT
    ? createSha256HashObj(h2, h1)
    : createSha256HashObj(h1, h2);

const reducerFn = fn => array => array.reduce(fn);
const getProp = prop => object => object[prop];

const getHash = getProp('hash');

const handleComputeProof = compose(getHash, reducerFn(computeProofReducer));

/**
 * Calculates the merkle root using the merkle proof by concatenating each pair of
 * hash hashes with the correct tree branch direction (left, right) and calculating
 * the sha256 hash of the concatenated pair, until the merkle root hash is generated
 * and returned.
 * The first hash needs to be in the first position of this array, with its
 * corresponding tree branch direction.
 * @param {Array<Node> | null} merkleProof
 * @returns {string} merkleRoot
 */
const getMerkleRootFromMerkleProof = merkleProof =>
  !merkleProof || merkleProof.length === 0
    ? ''
    : handleComputeProof(merkleProof);

const generate = (hashes, tree) => {
  if (hashes.length === 1) {
    return hashes;
  }
  ensureEven(hashes);
  const combinedHashes = [];
  for (let i = 0; i < hashes.length; i += 2) {
    const hashesConcatenated = hashes[i] + hashes[i + 1];
    const hash = computeHexEncodedSha256Hash(hashesConcatenated);
    combinedHashes.push(hash);
  }
  tree.push(combinedHashes);
  return generate(combinedHashes, tree);
};
/**
 * Creates a merkle tree, recursively, from the provided hashes, represented
 * with an array of arrays of hashes/nodes. Where each array in the array, or hash list,
 * is a tree level with all the hashes/nodes in that level.
 * In the array at position tree[0] (the first array of hashes) there are
 * all the original hashes.
 * In the array at position tree[1] there are the combined pair or sha256 hashes of the
 * hashes in the position tree[0], and so on.
 * In the last position (tree[tree.length - 1]) there is only one hash, which is the
 * root of the tree, or merkle root.
 * @param {PubkeyHashArray} hashes
 * @returns {Array<Array<string>>} merkleTree
 */
const generateMerkleTree = (hashes = []) => {
  if (!hashes || hashes.length === 0) {
    return [];
  }
  const tree = [hashes];
  generate(hashes, tree);
  return tree;
};

/**
 * Generates the merkle proof by first creating the merkle tree,
 * and then finding the hash index in the tree and calculating if it's a
 * left or right child (since the hashes are calculated in pairs,
 * hash at index 0 would be a left child, hash at index 1 would be a right child.
 * Even indices are left children, odd indices are right children),
 * then it finds the sibling node (the one needed to concatenate and hash it with the child node)
 * and adds it to the proof, with its direction (left or right)
 * then it calculates the position of the next node in the next level, by
 * dividing the child index by 2, so this new index can be used in the next iteration of the
 * loop, along with the level.
 * If we check the result of this representation of the merkle tree, we notice that
 * The first level has all the hashes, an even number of hashes.
 * All the levels have an even number of hashes, except the last one (since is the
 * merkle root)
 * The next level have half or less hashes than the previous level, which allows us
 * to find the hash associated with the index of a previous hash in the next level in constant time.
 * Then we simply return this merkle proof.
 * @param {string} hash
 * @param {PubkeyHashArray} hashes
 * @returns {null | Array<Node>} merkleProof
 */
const generateMerkleProof = (hash, hashes) => {
  if (!hash || !hashes || hashes.length === 0) {
    return null;
  }
  const tree = generateMerkleTree(hashes);
  const merkleProof = [
    {
      hash,
      direction: getLeafNodeDirectionInMerkleTree(hash, tree),
    },
  ];
  let hashIndex = tree[0].findIndex(h => h === hash);
  // eslint-disable-next-line no-plusplus
  for (let level = 0; level < tree.length - 1; level++) {
    const isLeftChild = hashIndex % 2 === 0;
    const siblingDirection = isLeftChild ? RIGHT : LEFT;
    const siblingIndex = isLeftChild ? hashIndex + 1 : hashIndex - 1;
    const siblingNode = {
      hash: tree[level][siblingIndex],
      direction: siblingDirection,
    };
    merkleProof.push(siblingNode);
    hashIndex = Math.floor(hashIndex / 2);
  }
  return merkleProof;
};

export const merkleTreeAPI = {
  generateMerkleRoot(pks) {
    return generateMerkleRoot(pks.map(computeHexEncodedSha256Hash));
  },
  generateMerkleTree(pks) {
    return generateMerkleTree(pks.map(computeHexEncodedSha256Hash));
  },
  generateMerkleProof(pkHash, hashes) {
    return generateMerkleProof(
      computeHexEncodedSha256Hash(pkHash),
      hashes.map(computeHexEncodedSha256Hash),
    );
  },
  getMerkleRootFromMerkleProof(proof) {
    return getMerkleRootFromMerkleProof(proof);
  },
};

harden(merkleTreeAPI);
export {
  getMerkleRootFromMerkleProof,
  generateMerkleProof,
  generateMerkleTree,
  generateMerkleRoot,
};
