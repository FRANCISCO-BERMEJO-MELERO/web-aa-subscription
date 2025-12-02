// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./SimpleAccount.sol";

/**
 * @title SimpleAccountFactory
 * @notice Factory for deploying SimpleAccount instances using CREATE2
 * @dev Enables deterministic account addresses and counterfactual deployment
 */
contract SimpleAccountFactory {
    SimpleAccount public immutable accountImplementation;

    event AccountCreated(
        address indexed account,
        address indexed owner,
        uint256 salt
    );

    constructor(IEntryPoint _entryPoint) {
        accountImplementation = new SimpleAccount(_entryPoint);
    }

    /**
     * @notice Create an account and return its address
     * @dev If account already exists, just return the address
     * @param owner The owner of the account
     * @param salt Salt for CREATE2
     * @return account The account address
     */
    function createAccount(
        address owner,
        uint256 salt
    ) public returns (SimpleAccount account) {
        address addr = getAddress(owner, salt);
        uint256 codeSize = addr.code.length;

        if (codeSize > 0) {
            return SimpleAccount(payable(addr));
        }

        account = SimpleAccount(
            payable(
                new ERC1967Proxy{salt: bytes32(salt)}(
                    address(accountImplementation),
                    abi.encodeCall(SimpleAccount.initialize, (owner))
                )
            )
        );

        emit AccountCreated(address(account), owner, salt);
    }

    /**
     * @notice Calculate the counterfactual address of an account
     * @param owner The owner of the account
     * @param salt Salt for CREATE2
     * @return The predicted account address
     */
    function getAddress(
        address owner,
        uint256 salt
    ) public view returns (address) {
        return
            Create2.computeAddress(
                bytes32(salt),
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(
                            address(accountImplementation),
                            abi.encodeCall(SimpleAccount.initialize, (owner))
                        )
                    )
                )
            );
    }
}
