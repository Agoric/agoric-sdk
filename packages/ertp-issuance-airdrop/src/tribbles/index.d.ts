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
export const computeHexEncodedSha256Hash: (initialValue: any) => any;
export namespace merkleTreeAPI {
    function generateMerkleRoot(pks: any): string;
    function generateMerkleTree(pks: any): string[][];
    function generateMerkleProof(pkHash: any, hashes: any): Node[] | null;
    function getMerkleRootFromMerkleProof(proof: any): string;
}
/**
 * - A SHA-256 hash of a public key, represented as a hexadecimal string.
 */
export type PublicKeyHash = string;
/**
 * An array of SHA-256 hashes, each computed against a different cryptocurrency public key.
 */
export type PubkeyHashArray = PublicKeyHash[];
export type Node = {
    hash: string;
    direction: string;
};
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
export function getMerkleRootFromMerkleProof(merkleProof: Array<Node> | null): string;
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
export function generateMerkleProof(hash: string, hashes: PubkeyHashArray): null | Array<Node>;
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
export function generateMerkleTree(hashes?: PubkeyHashArray): Array<Array<string>>;
/**
 * Generates the merkle root of the hashes passed through the parameter.
 * Recursively concatenates pair of hash hashes and calculates each sha256 hash of the
 * concatenated hashes until only one hash is left, which is the merkle root, and returns it.
 * @param {PubkeyHashArray} hashes
 * @returns {string} merkleRoot
 */
export function generateMerkleRoot(hashes: PubkeyHashArray): string;
//# sourceMappingURL=index.d.ts.map