// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SubscriptionService
 * @notice Service contract that receives and manages subscription payments
 * @dev This contract defines subscription plans and tracks user subscriptions
 */
contract SubscriptionService is Ownable {
    using SafeERC20 for IERC20;

    struct Plan {
        string name;
        uint256 price; // Price per interval
        uint256 interval; // Billing interval in seconds
        address token; // Payment token (address(0) for ETH)
        bool active;
    }

    struct UserSubscription {
        uint256 planId;
        uint256 startTime;
        uint256 expiresAt;
        bool active;
    }

    // Plans
    mapping(uint256 => Plan) public plans;
    uint256 public planCount;

    // User subscriptions
    mapping(address => UserSubscription) public userSubscriptions;

    // Revenue tracking
    mapping(address => uint256) public totalRevenue;

    // Events
    event PlanCreated(
        uint256 indexed planId,
        string name,
        uint256 price,
        uint256 interval,
        address token
    );

    event PlanUpdated(uint256 indexed planId, bool active);

    event SubscriptionStarted(
        address indexed user,
        uint256 indexed planId,
        uint256 startTime
    );

    event PaymentReceived(
        address indexed user,
        uint256 indexed planId,
        uint256 amount,
        uint256 timestamp
    );

    event SubscriptionCancelled(address indexed user, uint256 timestamp);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Create a new subscription plan
     * @param name Plan name
     * @param price Price per interval
     * @param interval Billing interval in seconds
     * @param token Payment token address
     * @return planId The ID of the created plan
     */
    function createPlan(
        string memory name,
        uint256 price,
        uint256 interval,
        address token
    ) external onlyOwner returns (uint256 planId) {
        planId = planCount++;

        plans[planId] = Plan({
            name: name,
            price: price,
            interval: interval,
            token: token,
            active: true
        });

        emit PlanCreated(planId, name, price, interval, token);
    }

    /**
     * @notice Update plan status
     * @param planId Plan ID
     * @param active New status
     */
    function updatePlanStatus(uint256 planId, bool active) external onlyOwner {
        require(planId < planCount, "Plan does not exist");
        plans[planId].active = active;
        emit PlanUpdated(planId, active);
    }

    /**
     * @notice Subscribe to a plan
     * @param planId Plan ID to subscribe to
     */
    function subscribe(uint256 planId) external payable {
        require(planId < planCount, "Plan does not exist");
        Plan memory plan = plans[planId];
        require(plan.active, "Plan is not active");

        // Cancel existing subscription if any
        if (userSubscriptions[msg.sender].active) {
            userSubscriptions[msg.sender].active = false;
        }

        // Process initial payment
        if (plan.token == address(0)) {
            require(msg.value >= plan.price, "Insufficient ETH sent");
            totalRevenue[address(0)] += plan.price;

            // Refund excess
            if (msg.value > plan.price) {
                (bool success, ) = msg.sender.call{
                    value: msg.value - plan.price
                }("");
                require(success, "Refund failed");
            }
        } else {
            IERC20(plan.token).safeTransferFrom(
                msg.sender,
                address(this),
                plan.price
            );
            totalRevenue[plan.token] += plan.price;
        }

        // Create subscription
        userSubscriptions[msg.sender] = UserSubscription({
            planId: planId,
            startTime: block.timestamp,
            expiresAt: block.timestamp + plan.interval,
            active: true
        });

        emit SubscriptionStarted(msg.sender, planId, block.timestamp);
        emit PaymentReceived(msg.sender, planId, plan.price, block.timestamp);
    }

    /**
     * @notice Process a recurring payment
     * @dev Called by the subscription module or automation service
     */
    function processPayment(address user) external payable {
        UserSubscription storage userSub = userSubscriptions[user];
        require(userSub.active, "No active subscription");

        Plan memory plan = plans[userSub.planId];
        require(plan.active, "Plan is not active");

        // Process payment
        if (plan.token == address(0)) {
            require(msg.value >= plan.price, "Insufficient ETH sent");
            totalRevenue[address(0)] += plan.price;
        } else {
            IERC20(plan.token).safeTransferFrom(
                msg.sender,
                address(this),
                plan.price
            );
            totalRevenue[plan.token] += plan.price;
        }

        // Extend subscription
        userSub.expiresAt = block.timestamp + plan.interval;

        emit PaymentReceived(user, userSub.planId, plan.price, block.timestamp);
    }

    /**
     * @notice Cancel subscription
     */
    function cancelSubscription() external {
        require(userSubscriptions[msg.sender].active, "No active subscription");
        userSubscriptions[msg.sender].active = false;
        emit SubscriptionCancelled(msg.sender, block.timestamp);
    }

    /**
     * @notice Check if user has active subscription
     * @param user User address
     * @return bool True if user has active subscription
     */
    function hasActiveSubscription(address user) external view returns (bool) {
        UserSubscription memory userSub = userSubscriptions[user];
        return userSub.active && block.timestamp < userSub.expiresAt;
    }

    /**
     * @notice Get plan details
     * @param planId Plan ID
     * @return Plan data
     */
    function getPlan(uint256 planId) external view returns (Plan memory) {
        require(planId < planCount, "Plan does not exist");
        return plans[planId];
    }

    /**
     * @notice Withdraw accumulated revenue
     * @param token Token address (address(0) for ETH)
     */
    function withdrawRevenue(address token) external onlyOwner {
        uint256 amount = totalRevenue[token];
        require(amount > 0, "No revenue to withdraw");

        totalRevenue[token] = 0;

        if (token == address(0)) {
            (bool success, ) = owner().call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
