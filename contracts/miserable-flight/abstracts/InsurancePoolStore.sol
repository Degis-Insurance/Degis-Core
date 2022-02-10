// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

abstract contract InsurancePoolStore {
    address public policyFlow;
    address public emergencyPool;

    uint256 public purchaseIncentiveAmount;

    uint256 public frozenTime = 12 hours; // 7 days

    struct UserInfo {
        uint256 depositTime;
        uint256 pendingBalance; // the amount in the unstake queue
    }
    mapping(address => UserInfo) public userInfo;

    //  of every unstake request in the queue
    struct UnstakeRequest {
        uint256 pendingAmount;
        uint256 fulfilledAmount;
        bool isPaidOut; // if this request has been fully paid out // maybe redundant
    }

    // a user's unstake requests
    mapping(address => UnstakeRequest[]) internal unstakeRequests;

    // list of all unstake users
    address[] internal unstakeQueue;

    // 1 LP = LPValue(USD)
    uint256 public LPValue;

    // Total staking balance of the pool
    uint256 public totalStakingBalance;

    // Real staking balance = current staking balance - sum(unstake request in the queue)
    uint256 public realStakingBalance;

    // Locked balance is for potiential payoff
    uint256 public lockedBalance;

    // locked relation = locked balance / totalStakingBalance
    uint256 public lockedRatio; //  1e18 = 1  1e17 = 0.1  1e19 = 10
    uint256 public collateralFactor; //  1e18 = 1  1e17 = 0.1  1e19 = 10

    // Available capacity for taking new
    uint256 public availableCapacity;

    // Premiums have been paid but the policies haven't expired
    uint256 public activePremiums;

    // [0]: LP, [1]: Lottery, [2]: Emergency
    uint256[3] public rewardDistribution;

    // events
    event Stake(address indexed userAddress, uint256 amount);
    event Unstake(address indexed userAddress, uint256 amount);

    event CollateralFactorChanged(uint256 oldFactor, uint256 newFactor);

    event PolicyFlowChanged(address policyFlowAddress);

    event BuyNewPolicy(
        address indexed userAddress,
        uint256 premium,
        uint256 payout
    );
    event RewardDistributionChanged(
        uint256 toLP,
        uint256 toLottery,
        uint256 toEmergency
    );

    event FrozenTimeChanged(uint256 _newFrozenTime);

    event PremiumDistributed(
        uint256 _premiumToEmergency,
        uint256 _premiumToLottery
    );
}
