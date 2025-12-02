// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Mock ERC20 token for testing subscriptions
 */
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        // Mint 1 million tokens to deployer
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }

    /**
     * @notice Mint tokens to any address (for testing)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Decimals override
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
