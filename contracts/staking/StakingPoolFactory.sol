// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "../utils/Ownable.sol";

import "./interfaces/IPool.sol";

import "./CoreStakingPool.sol";

import "../tokens/interfaces/IDegisToken.sol";

contract StakingPoolFactory is Ownable {
    /// @dev Auxiliary data structure used only in getPoolData() view function
    struct PoolData {
        // @dev pool token address (Degis / Degis LP Token)
        address poolToken;
        // @dev pool address
        address poolAddress;
        // @dev start block
        uint256 startBlock;
        // @dev pool weight
        uint256 degisPerBlock;
        // @dev flash pool flag
        bool isFlashPool;
    }

    address public degisToken;

    /// @dev Pool token address  => pool address
    mapping(address => address) public pools;

    /// @dev Keeps track of registered pool addresses, pool address -> whether exists
    mapping(address => bool) public poolExists;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @dev Fired in createPool() and _registerPool()
     *
     * @param by who deploys a new pool
     * @param poolToken pool token address
     * @param poolAddress deployed pool instance address
     * @param degisPerBlock pool weight
     * @param isFlashPool flag indicating if pool is a flash pool
     */
    event PoolRegistered(
        address indexed by,
        address indexed poolToken,
        address indexed poolAddress,
        uint256 degisPerBlock,
        bool isFlashPool
    );

    /**
     * @notice Change the degis reward for pool
     */
    event DegisPerBlockChanged(address pool, uint256 degisPerBlock);

    /**
     * @dev Creates/deploys a factory instance
     *
     * @param _degisToken Degis token address
     */
    constructor(address _degisToken) {
        degisToken = _degisToken;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    function getPoolAddress(address poolToken) external view returns (address) {
        return pools[poolToken];
    }

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
        bool isFlashPool = IPool(poolAddr).isFlashPool();
        uint256 startBlock = IPool(poolAddr).startBlock();
        uint256 degisPerBlock = IPool(poolAddr).degisPerBlock();

        // create the in-memory structure and return it
        return
            PoolData({
                poolToken: poolToken,
                poolAddress: poolAddr,
                startBlock: startBlock,
                degisPerBlock: degisPerBlock,
                isFlashPool: isFlashPool
            });
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Set Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Set degis per block
     * @param _pool Address of the staking pool
     * @param _degisPerBlock Degis reward per block
     */
    function setDegisPerBlock(address _pool, uint256 _degisPerBlock)
        external
        onlyOwner
    {
        BasePool(_pool).setDegisPerBlock(_degisPerBlock);

        emit DegisPerBlockChanged(_pool, _degisPerBlock);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ Main Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @dev Creates a staking pool and registers it within the factory
     * @param poolToken pool token address
     * @param startBlock init block to be used for the pool created
     * @param degisPerBlock weight of the pool to be created
     * @param isFlashPool Whether it is a flash pool
     */
    function createPool(
        address poolToken,
        uint256 startBlock,
        uint256 degisPerBlock,
        bool isFlashPool
    ) external onlyOwner {
        // create/deploy new core pool instance
        IPool pool = new CoreStakingPool(
            degisToken,
            poolToken,
            address(this),
            startBlock,
            degisPerBlock,
            isFlashPool
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
        // read pool information from the pool smart contract
        // via the pool interface (IPool)
        address poolToken = IPool(_poolAddr).poolToken();
        bool isFlashPool = IPool(_poolAddr).isFlashPool();
        uint256 degisPerBlock = IPool(_poolAddr).degisPerBlock();

        // ensure that the pool is not already registered within the factory
        require(
            pools[poolToken] == address(0),
            "This pool is already registered"
        );

        // create pool structure, register it within the factory
        pools[poolToken] = _poolAddr;
        poolExists[_poolAddr] = true;
        // update total pool weight of the factory

        // emit an event
        emit PoolRegistered(
            msg.sender,
            poolToken,
            _poolAddr,
            degisPerBlock,
            isFlashPool
        );
    }

    /**
     * @notice Mint degis tokens as reward
     * @dev With this function, we only need to add factory contract into minterList
     * @param _to The address to mint tokens to
     * @param _amount Amount of degis tokens to mint
     */
    function mintReward(address _to, uint256 _amount) external {
        // verify that sender is a pool registered withing the factory
        require(poolExists[msg.sender], "Only called from pool");

        // mint degis tokens as required
        IDegisToken(degisToken).mintDegis(_to, _amount);
    }
}
