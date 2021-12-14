// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IDegisLottery {
    /**
     * @notice Buy tickets for the current lottery
     * @param _ticketNumbers: array of ticket numbers between 10,000 and 19,999
     * @dev Callable by users
     */
    function buyTickets(uint32[] calldata _ticketNumbers) external;

    /**
     * @notice Redeem tickets for all lottery
     * @param _ticketIds: array of ticket ids
     * @dev Callable by users
     */
    function redeemTickets(uint256[] calldata _ticketIds) external;

    /**
     * @notice Claim a set of winning tickets for a lottery
     * @param _lotteryId: lottery id
     * @param _ticketIds: array of ticket ids
     * @dev Callable by users only, not contract!
     */
    function claimTickets(uint256 _lotteryId, uint256[] calldata _ticketIds)
        external;

    /**
     * @notice Claim all winning tickets for a lottery
     * @param _lotteryId: lottery id
     * @dev Callable by users only, not contract!
     */
    function claimAllTickets(uint256 _lotteryId) external;

    /**
     * @notice Close lottery
     * @param _lotteryId: lottery id
     * @dev Callable by operator
     */
    function closeLottery(uint256 _lotteryId) external;

    /**
     * @notice Draw the final number, calculate reward in CAKE per group, and make lottery claimable
     * @param _lotteryId: lottery id
     * @param _autoInjection: reinjects funds into next lottery (vs. withdrawing all)
     * @dev Callable by operator
     */
    function drawFinalNumberAndMakeLotteryClaimable(
        uint256 _lotteryId,
        bool _autoInjection
    ) external;

    /**
     * @notice Inject funds
     * @param _lotteryId: lottery id
     * @param _amount: amount to inject in CAKE token
     * @dev Callable by operator
     */
    function injectFunds(uint256 _lotteryId, uint256 _amount) external;

    /**
     * @notice Start the lottery
     * @dev Callable by operator
     * @param _endTime: endTime of the lottery
     * @param _priceTicketInCake: price of a ticket in CAKE
     * @param _rewardsBreakdown: breakdown of rewards per bracket (must sum to 10,000)
     * @param _treasuryFee: treasury fee (10,000 = 100%, 100 = 1%)
     */
    function startLottery(
        uint256 _endTime,
        uint256 _priceTicketInCake,
        uint256[4] calldata _rewardsBreakdown,
        uint256 _treasuryFee
    ) external;

    /**
     * @notice View current lottery id
     */
    function viewCurrentLotteryId() external view returns (uint256);
}
