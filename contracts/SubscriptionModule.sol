// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SubscriptionModule
 * @notice ERC-7579 compliant module for managing recurring subscriptions
 * @dev This module allows smart accounts to create and manage subscriptions with automated payments
 */
contract SubscriptionModule {
    using SafeERC20 for IERC20;

    // Module type identifier for ERC-7579
    uint256 public constant MODULE_TYPE = 2; // Executor module

    struct Subscription {
        address service;        // Service contract receiving payments
        address token;          // Token used for payments (address(0) for ETH)
        uint256 amount;         // Amount per payment
        uint256 interval;       // Time between payments in seconds
        uint256 lastPayment;    // Timestamp of last payment
        bool active;            // Subscription status
    }

    // Mapping: smart account => subscription ID => subscription data
    mapping(address => mapping(uint256 => Subscription)) public subscriptions;
    
    // Mapping: smart account => subscription count
    mapping(address => uint256) public subscriptionCount;

    // Events
    event SubscriptionCreated(
        address indexed account,
        uint256 indexed subscriptionId,
        address service,
        address token,
        uint256 amount,
        uint256 interval
    );

    event SubscriptionCancelled(
        address indexed account,
        uint256 indexed subscriptionId
    );

    event PaymentExecuted(
        address indexed account,
        uint256 indexed subscriptionId,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @notice Create a new subscription
     * @param service Address of the service contract
     * @param token Token address (address(0) for ETH)
     * @param amount Amount per payment
     * @param interval Time between payments in seconds
     * @return subscriptionId The ID of the created subscription
     */
    function createSubscription(
        address service,
        address token,
        uint256 amount,
        uint256 interval
    ) external returns (uint256 subscriptionId) {
        require(service != address(0), "Invalid service address");
        require(amount > 0, "Amount must be greater than 0");
        require(interval > 0, "Interval must be greater than 0");

        subscriptionId = subscriptionCount[msg.sender]++;
        
        subscriptions[msg.sender][subscriptionId] = Subscription({
            service: service,
            token: token,
            amount: amount,
            interval: interval,
            lastPayment: block.timestamp,
            active: true
        });

        emit SubscriptionCreated(
            msg.sender,
            subscriptionId,
            service,
            token,
            amount,
            interval
        );
    }

    /**
     * @notice Cancel an active subscription
     * @param subscriptionId ID of the subscription to cancel
     */
    function cancelSubscription(uint256 subscriptionId) external {
        Subscription storage sub = subscriptions[msg.sender][subscriptionId];
        require(sub.active, "Subscription not active");

        sub.active = false;

        emit SubscriptionCancelled(msg.sender, subscriptionId);
    }

    /**
     * @notice Execute a subscription payment
     * @param account Smart account address
     * @param subscriptionId ID of the subscription
     */
    function executePayment(address account, uint256 subscriptionId) external {
        Subscription storage sub = subscriptions[account][subscriptionId];
        
        require(sub.active, "Subscription not active");
        require(
            block.timestamp >= sub.lastPayment + sub.interval,
            "Payment not due yet"
        );

        sub.lastPayment = block.timestamp;

        // Execute payment
        if (sub.token == address(0)) {
            // ETH payment
            (bool success, ) = sub.service.call{value: sub.amount}("");
            require(success, "ETH transfer failed");
        } else {
            // ERC20 payment
            IERC20(sub.token).safeTransferFrom(account, sub.service, sub.amount);
        }

        emit PaymentExecuted(account, subscriptionId, sub.amount, block.timestamp);
    }

    /**
     * @notice Check if a payment is due for a subscription
     * @param account Smart account address
     * @param subscriptionId ID of the subscription
     * @return bool True if payment is due
     */
    function isPaymentDue(address account, uint256 subscriptionId) 
        external 
        view 
        returns (bool) 
    {
        Subscription storage sub = subscriptions[account][subscriptionId];
        
        if (!sub.active) return false;
        
        return block.timestamp >= sub.lastPayment + sub.interval;
    }

    /**
     * @notice Get subscription details
     * @param account Smart account address
     * @param subscriptionId ID of the subscription
     * @return Subscription data
     */
    function getSubscription(address account, uint256 subscriptionId)
        external
        view
        returns (Subscription memory)
    {
        return subscriptions[account][subscriptionId];
    }

    /**
     * @notice ERC-7579 module installation hook
     * @param data Installation data
     */
    function onInstall(bytes calldata data) external {
        // Module installation logic
        // Can be used to set initial configuration
    }

    /**
     * @notice ERC-7579 module uninstallation hook
     * @param data Uninstallation data
     */
    function onUninstall(bytes calldata data) external {
        // Module uninstallation logic
        // Cancel all active subscriptions for this account
        uint256 count = subscriptionCount[msg.sender];
        for (uint256 i = 0; i < count; i++) {
            if (subscriptions[msg.sender][i].active) {
                subscriptions[msg.sender][i].active = false;
            }
        }
    }

    /**
     * @notice Check if module is of a certain type
     * @param typeId Type identifier
     * @return bool True if module is of the specified type
     */
    function isModuleType(uint256 typeId) external pure returns (bool) {
        return typeId == MODULE_TYPE;
    }
}
