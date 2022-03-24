// SPDX-License-Identifier: GPL-3.0-or-later

/*
 //======================================================================\\
 //======================================================================\\
    *******         **********     ***********     *****     ***********
    *      *        *              *                 *       *
    *        *      *              *                 *       *
    *         *     *              *                 *       *
    *         *     *              *                 *       *
    *         *     **********     *       *****     *       ***********
    *         *     *              *         *       *                 *
    *         *     *              *         *       *                 *
    *        *      *              *         *       *                 *
    *      *        *              *         *       *                 *
    *******         **********     ***********     *****     ***********
 \\======================================================================//
 \\======================================================================//
*/

pragma solidity ^0.8.10;

import {Ownable} from "../utils/Ownable.sol";
import {IPool} from "./interfaces/IPool.sol";
import {BasePool, CoreStakingPool} from "./CoreStakingPool.sol";
import {IDegisToken} from "../tokens/interfaces/IDegisToken.sol";

contract StakingPoolFactory is Ownable {
    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // Pool data info
    struct PoolData {
        address poolToken; // pool token address (Degis / Degis LP Token)
        address poolAddress; // pool address (deployed by factory)
        uint256 startTimestamp; // pool start timestamp
        uint256 degisPerSecond; // reward speed
    }

    address public degisToken;

    // Pool token address  => pool address
    mapping(address => address) public pools;

    // Pool address -> whether exists
    mapping(address => bool) public poolExists;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event PoolRegistered(
        address indexed by,
        address indexed poolToken,
        address indexed poolAddress,
        uint256 degisPerSecond
    );

    event DegisPerSecondChanged(address pool, uint256 degisPerSecond);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor(address _degisToken) Ownable(msg.sender) {
        degisToken = _degisToken;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Get the pool address from pool token address
     * @param _poolToken Pool token address
     */
    function getPoolAddress(address _poolToken)
        external
        view
        returns (address)
    {
        return pools[_poolToken];
    }

    /**
     * @notice Get pool data from pool token address
     * @param _poolToken Pool token address
     * @return poolData Pool data struct
     */
    function getPoolData(address _poolToken)
        public
        view
        returns (PoolData memory)
    {
        // get the pool address from the mapping
        address poolAddr = pools[_poolToken];

        // throw if there is no pool registered for the token specified
        require(poolAddr != address(0), "pool not found");

        // read pool information from the pool smart contract
        // via the pool interface (IPool)
        address poolToken = IPool(poolAddr).poolToken();
        uint256 startTimestamp = IPool(poolAddr).startTimestamp();
        uint256 degisPerSecond = IPool(poolAddr).degisPerSecond();

        // create the in-memory structure and return it
        return
            PoolData({
                poolToken: poolToken,
                poolAddress: poolAddr,
                startTimestamp: startTimestamp,
                degisPerSecond: degisPerSecond
            });
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Set degis per second for a pool
     * @param _pool Address of the staking pool
     * @param _degisPerSecond Degis reward per second
     */
    function setDegisPerSecond(address _pool, uint256 _degisPerSecond)
        external
        onlyOwner
    {
        BasePool(_pool).setDegisPerSecond(_degisPerSecond);

        emit DegisPerSecondChanged(_pool, _degisPerSecond);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Creates a staking pool and registers it within the factory
     * @dev Only called by the owner
     * @param _poolToken Pool token address
     * @param _startTimestamp Start timestamp for reward
     * @param _degisPerSecond Reward speed
     */
    function createPool(
        address _poolToken,
        uint256 _startTimestamp,
        uint256 _degisPerSecond
    ) external onlyOwner {
        // create/deploy new core pool instance
        IPool pool = new CoreStakingPool(
            degisToken,
            _poolToken,
            address(this),
            _startTimestamp,
            _degisPerSecond
        );

        // register it within a factory
        _registerPool(address(pool));
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Register a deployed pool instance within the factory
     * @param _poolAddr Address of the already deployed pool instance
     */
    function _registerPool(address _poolAddr) internal {
        // Read pool information from the pool smart contract
        // via the pool interface (IPool)
        address poolToken = IPool(_poolAddr).poolToken();
        uint256 degisPerSecond = IPool(_poolAddr).degisPerSecond();

        // Ensure that the pool is not already registered within the factory
        require(
            pools[poolToken] == address(0),
            "This pool is already registered"
        );

        // Record
        pools[poolToken] = _poolAddr;
        poolExists[_poolAddr] = true;

        emit PoolRegistered(
            msg.sender,
            poolToken,
            _poolAddr,
            degisPerSecond
        );
    }

    /**
     * @notice Mint degis tokens as reward
     * @dev With this function, we only need to add factory contract into minterList
     * @param _to The address to mint tokens to
     * @param _amount Amount of degis tokens to mint
     */
    function mintReward(address _to, uint256 _amount) external {
        // Verify that sender is a pool registered withing the factory
        require(poolExists[msg.sender], "Only called from pool");

        // Mint degis tokens as required
        IDegisToken(degisToken).mintDegis(_to, _amount);
    }
}
