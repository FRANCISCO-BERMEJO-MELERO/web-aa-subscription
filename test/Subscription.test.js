const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SubscriptionModule", function () {
    let subscriptionModule;
    let subscriptionService;
    let mockToken;
    let owner;
    let user;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        // Deploy MockERC20
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockToken = await MockERC20.deploy();
        await mockToken.waitForDeployment();

        // Deploy SubscriptionModule
        const SubscriptionModule = await ethers.getContractFactory("SubscriptionModule");
        subscriptionModule = await SubscriptionModule.deploy();
        await subscriptionModule.waitForDeployment();

        // Deploy SubscriptionService
        const SubscriptionService = await ethers.getContractFactory("SubscriptionService");
        subscriptionService = await SubscriptionService.deploy();
        await subscriptionService.waitForDeployment();
    });

    describe("Subscription Creation", function () {
        it("Should create a subscription", async function () {
            const serviceAddress = await subscriptionService.getAddress();
            const tokenAddress = await mockToken.getAddress();

            const tx = await subscriptionModule.createSubscription(
                serviceAddress,
                tokenAddress,
                ethers.parseEther("10"),
                3600 // 1 hour
            );

            await tx.wait();

            const subscription = await subscriptionModule.getSubscription(owner.address, 0);
            expect(subscription.service).to.equal(serviceAddress);
            expect(subscription.amount).to.equal(ethers.parseEther("10"));
            expect(subscription.interval).to.equal(3600);
            expect(subscription.active).to.be.true;
        });

        it("Should fail with invalid service address", async function () {
            await expect(
                subscriptionModule.createSubscription(
                    ethers.ZeroAddress,
                    await mockToken.getAddress(),
                    ethers.parseEther("10"),
                    3600
                )
            ).to.be.revertedWith("Invalid service address");
        });

        it("Should fail with zero amount", async function () {
            await expect(
                subscriptionModule.createSubscription(
                    await subscriptionService.getAddress(),
                    await mockToken.getAddress(),
                    0,
                    3600
                )
            ).to.be.revertedWith("Amount must be greater than 0");
        });
    });

    describe("Subscription Cancellation", function () {
        beforeEach(async function () {
            await subscriptionModule.createSubscription(
                await subscriptionService.getAddress(),
                await mockToken.getAddress(),
                ethers.parseEther("10"),
                3600
            );
        });

        it("Should cancel an active subscription", async function () {
            await subscriptionModule.cancelSubscription(0);

            const subscription = await subscriptionModule.getSubscription(owner.address, 0);
            expect(subscription.active).to.be.false;
        });

        it("Should fail to cancel inactive subscription", async function () {
            await subscriptionModule.cancelSubscription(0);

            await expect(
                subscriptionModule.cancelSubscription(0)
            ).to.be.revertedWith("Subscription not active");
        });
    });

    describe("Module Type", function () {
        it("Should return correct module type", async function () {
            expect(await subscriptionModule.isModuleType(2)).to.be.true;
            expect(await subscriptionModule.isModuleType(1)).to.be.false;
        });
    });
});

describe("SubscriptionService", function () {
    let subscriptionService;
    let mockToken;
    let owner;
    let user;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        const MockERC20 = await ethers.getContractFactory("MockERC20");
        mockToken = await MockERC20.deploy();
        await mockToken.waitForDeployment();

        const SubscriptionService = await ethers.getContractFactory("SubscriptionService");
        subscriptionService = await SubscriptionService.deploy();
        await subscriptionService.waitForDeployment();
    });

    describe("Plan Management", function () {
        it("Should create a plan", async function () {
            await subscriptionService.createPlan(
                "Basic Plan",
                ethers.parseEther("0.001"),
                3600,
                ethers.ZeroAddress
            );

            const plan = await subscriptionService.getPlan(0);
            expect(plan.name).to.equal("Basic Plan");
            expect(plan.price).to.equal(ethers.parseEther("0.001"));
            expect(plan.interval).to.equal(3600);
            expect(plan.active).to.be.true;
        });

        it("Should update plan status", async function () {
            await subscriptionService.createPlan(
                "Basic Plan",
                ethers.parseEther("0.001"),
                3600,
                ethers.ZeroAddress
            );

            await subscriptionService.updatePlanStatus(0, false);
            const plan = await subscriptionService.getPlan(0);
            expect(plan.active).to.be.false;
        });
    });

    describe("Subscriptions", function () {
        beforeEach(async function () {
            await subscriptionService.createPlan(
                "Basic Plan",
                ethers.parseEther("0.001"),
                3600,
                ethers.ZeroAddress
            );
        });

        it("Should subscribe to a plan with ETH", async function () {
            await subscriptionService.connect(user).subscribe(0, {
                value: ethers.parseEther("0.001")
            });

            const userSub = await subscriptionService.userSubscriptions(user.address);
            expect(userSub.planId).to.equal(0);
            expect(userSub.active).to.be.true;
        });

        it("Should fail with insufficient payment", async function () {
            await expect(
                subscriptionService.connect(user).subscribe(0, {
                    value: ethers.parseEther("0.0005")
                })
            ).to.be.revertedWith("Insufficient ETH sent");
        });

        it("Should cancel subscription", async function () {
            await subscriptionService.connect(user).subscribe(0, {
                value: ethers.parseEther("0.001")
            });

            await subscriptionService.connect(user).cancelSubscription();

            const userSub = await subscriptionService.userSubscriptions(user.address);
            expect(userSub.active).to.be.false;
        });
    });
});
