// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.28;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable {
    string private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(string account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(string owner);

    event OwnershipTransferred(
        string indexed previousOwner,
        string indexed newOwner
    );

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(string memory initialOwner) {
        // if (initialOwner == address(0)) {
        //     revert OwnableInvalidOwner(address(0));
        // }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner(string calldata incomingAddress) {
        _checkOwner(incomingAddress);
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (string memory) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner(
        string calldata incomingAddress
    ) internal view virtual {
        if (keccak256(bytes(owner())) != keccak256(bytes(incomingAddress))) {
            revert OwnableUnauthorizedAccount(incomingAddress);
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership(
        string calldata currentOwner
    ) public virtual onlyOwner(currentOwner) {
        _transferOwnership(
            string(
                abi.encodePacked('0x0000000000000000000000000000000000000000')
            )
        );
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(
        string calldata oldOwner,
        string calldata newOwner
    ) public virtual onlyOwner(oldOwner) {
        // if (newOwner == address(0)) {
        //     revert OwnableInvalidOwner(address(0));
        // }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(string memory newOwner) internal virtual {
        string memory oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
