// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {AxelarExecutable} from '@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol';
import {IAxelarGasService} from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol';
import {IERC20} from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol';
import {StringToAddress, AddressToString} from '@axelar-network/axelar-gmp-sdk-solidity/contracts/libs/AddressString.sol';
import {Ownable} from './Ownable.sol';

struct CallResult {
    bool success;
    bytes result;
}

struct AgoricResponse {
    // false if this is a smart wallet creation, true if it's a contract call
    bool isContractCallResult;
    CallResult[] data;
}

struct CallParams {
    address target;
    bytes data;
}

contract Wallet is AxelarExecutable, Ownable {
    IAxelarGasService public gasService;

    constructor(
        address gateway_,
        address gasReceiver_,
        string memory owner_
    ) AxelarExecutable(gateway_) Ownable(owner_) {
        gasService = IAxelarGasService(gasReceiver_);
    }

    function _multicall(
        bytes calldata payload
    ) internal returns (CallResult[] memory) {
        CallParams[] memory calls = abi.decode(payload, (CallParams[]));

        CallResult[] memory results = new CallResult[](calls.length);

        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory result) = calls[i].target.call(
                calls[i].data
            );
            require(success, 'Contract call failed');
            results[i] = CallResult(success, result);
        }

        return results;
    }

    function _execute(
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override onlyOwner(sourceAddress) {
        _multicall(payload);
    }

    function _executeWithToken(
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload,
        string calldata symbol,
        uint256 amount
    ) internal override {
        address tokenAddress = gateway.tokenAddresses(symbol);
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        IERC20(tokenAddress).approve(address(gateway), amount);
        IERC20(tokenAddress).approve(address(gasService), amount);

        bytes memory responsePayload = abi.encodePacked(
            bytes4(0x00000000),
            abi.encode(AgoricResponse(true, _multicall(payload)))
        );

        gasService.payGasForContractCall(
            address(this),
            sourceChain,
            sourceAddress,
            responsePayload,
            tokenAddress,
            amount,
            address(this)
        );

        gateway.callContract(sourceChain, sourceAddress, responsePayload);
    }
}

contract Factory is AxelarExecutable {
    using StringToAddress for string;
    using AddressToString for address;

    address _gateway;
    IAxelarGasService public immutable gasService;
    string public chainName;

    event WalletCreated(address indexed target, string ownerAddress);

    constructor(
        address gateway_,
        address gasReceiver_,
        string memory chainName_
    ) AxelarExecutable(gateway_) {
        gasService = IAxelarGasService(gasReceiver_);
        _gateway = gateway_;
        chainName = chainName_;
    }

    function createVendor(string memory owner) public returns (address) {
        address newVendorAddress = address(
            new Wallet(_gateway, address(gasService), owner)
        );
        emit WalletCreated(newVendorAddress, owner);
        return newVendorAddress;
    }

    function _execute(
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata /*payload*/
    ) internal override {
        address vendorAddress = createVendor(sourceAddress);
        CallResult[] memory results = new CallResult[](1);
        results[0] = CallResult(true, abi.encode(vendorAddress));
    }

    function _executeWithToken(
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload,
        string calldata symbol,
        uint256 amount
    ) internal override {
        address tokenAddress = gateway.tokenAddresses(symbol);
        IERC20(tokenAddress).approve(address(gasService), amount);

        address vendorAddress = createVendor(sourceAddress);
        CallResult[] memory results = new CallResult[](1);
        results[0] = CallResult(true, abi.encode(vendorAddress));

        bytes memory msgPayload = abi.encodePacked(
            bytes4(0x00000000),
            abi.encode(AgoricResponse(false, results))
        );

        gasService.payGasForContractCall(
            address(this),
            sourceChain,
            sourceAddress,
            msgPayload,
            tokenAddress,
            amount,
            address(this)
        );

        gateway.callContract(sourceChain, sourceAddress, msgPayload);
    }
}
