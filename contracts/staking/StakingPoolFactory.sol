// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "../utils/Ownable.sol";

import "./interfaces/IPool.sol";

import "./abstracts/BasePool.sol";

contract StakingPoolFactory is Ownable {
    /// @dev Auxiliary data structure used only in getPoolData() view function
    struct PoolData {
        // @dev pool token address (Degis / Degis LP Token)
        address poolToken;
        // @dev pool address
        address poolAddress;
        // @dev pool weight
        uint256 degisPerBlock;
        // @dev flash pool flag
        bool isFlashPool;
    }

    uint256 public totalDegisPerBlock;

    /**
     * @dev After endBlock all staking rewards will be stopped
     */
    uint256 public endBlock;

    /// @dev Pool token address  => pool address
    mapping(address => address) public pools;

    /// @dev Keeps track of registered pool addresses, pool address -> whether exists
    mapping(address => bool) public poolExists;

    /**
     * @dev Fired in createPool() and registerPool()
     *
     * @param _by an address which executed an action
     * @param poolToken pool token address (like ILV)
     * @param poolAddress deployed pool instance address
     * @param weight pool weight
     * @param isFlashPool flag indicating if pool is a flash pool
     */
    event PoolRegistered(
        address indexed _by,
        address indexed poolToken,
        address indexed poolAddress,
        uint64 weight,
        bool isFlashPool
    );

    /**
     * @dev Fired in changePoolWeight()
     *
     * @param _by an address which executed an action
     * @param poolAddress deployed pool instance address
     * @param weight new pool weight
     */
    event WeightUpdated(
        address indexed _by,
        address indexed poolAddress,
        uint32 weight
    );

    event DegisPerBlockChanged(address pool, uint256 degisPerBlock);

    /**
     * @dev Creates/deploys a factory instance
     *
     * @param _degisToken Degis token address
     */
    constructor(
        address _degisToken,
        uint256 _initBlock,
        uint256 _endBlock
    ) {
        require(
            _endBlock > _initBlock,
            "invalid end block: must be greater than init block"
        );

        endBlock = _endBlock;
    }

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
        uint256 degisPerBlock = IPool(poolAddr).degisPerBlock();

        // create the in-memory structure and return it
        return
            PoolData({
                poolToken: poolToken,
                poolAddress: poolAddr,
                degisPerBlock: degisPerBlock,
                isFlashPool: isFlashPool
            });
    }

    /**
     * @dev Creates a core pool (IlluviumCorePool) and registers it within the factory
     *
     * @dev Can be executed by the pool factory owner only
     *
     * @param poolToken pool token address (like ILV, or ILV/ETH pair)
     * @param initBlock init block to be used for the pool created
     * @param weight weight of the pool to be created
     */
    function createPool(
        address poolToken,
        uint64 initBlock,
        uint32 weight
    ) external virtual onlyOwner {
        // create/deploy new core pool instance
        IPool pool = new BasePool(degisToken, poolToken, address(this));

        // register it within a factory
        registerPool(address(pool));
    }

    /**
     * @notice Register a deployed pool instance within the factory
     * @param _poolAddr Address of the already deployed pool instance
     */
    function registerPool(address _poolAddr) public onlyOwner {
        // read pool information from the pool smart contract
        // via the pool interface (IPool)
        address poolToken = IPool(_poolAddr).poolToken();
        bool isFlashPool = IPool(_poolAddr).isFlashPool();
        uint32 weight = IPool(_poolAddr).weight();

        // ensure that the pool is not already registered within the factory
        require(
            pools[poolToken] == address(0),
            "this pool is already registered"
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
            weight,
            isFlashPool
        );
    }

    /**
     * @notice Set degis per block
     */
    function setDegisPerBlock(address _pool, uint256 _degisPerBlock) external {
        BasePool(_pool).setDegisPerBlock(_degisPerBlock);

        emit DegisPerBlockChanged(_pool, _degisPerBlock);
    }

    /**
     * @notice Mint degis tokens as reward
     * @dev With this function, we only need to add factory contract into minterList
     * @param _to The address to mint tokens to
     * @param _amount Amount of degis tokens to mint
     */
    function mintReward(address _to, uint256 _amount) external {
        // verify that sender is a pool registered withing the factory
        require(poolExists[msg.sender], "access denied");

        // mint degis tokens as required
        degis.mintDegis(_to, _amount);
    }
}
