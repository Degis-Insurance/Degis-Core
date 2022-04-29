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
import "./NPPolicyToken.sol";
import "./NaughtyPair.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {INaughtyPair} from "./interfaces/INaughtyPair.sol";
import {IPolicyCore} from "./interfaces/IPolicyCore.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title Naughty Factory
 * @dev Factory contract to deploy new pools periodically
 *      Each pool(product) will have a unique naughtyId
 *      Each pool will have its pool token
 *      PolicyToken - Stablecoin
 *      Token 0 may change but Token 1 is always stablecoin.
 */

contract NaughtyFactory is OwnableUpgradeable {
    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // INIT_CODE_HASH for NaughtyPair, may be used in frontend
    bytes32 public constant PAIR_INIT_CODE_HASH =
        keccak256(abi.encodePacked(type(NaughtyPair).creationCode));

    // PolicyToken Address => StableCoin Address => Pool Address
    mapping(address => mapping(address => address)) getPair;

    // Store all the pairs' addresses
    address[] public allPairs;

    // Store all policy tokens' addresses
    address[] public allTokens;

    // Next pool id to be deployed
    uint256 public _nextId;

    // Address of policyCore
    address public policyCore;

    // Address of income maker, part of the transaction fee will be distributed to this address
    address public incomeMaker;

    // Swap fee proportion to income maker
    uint256 public incomeMakerProportion;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event PolicyCoreAddressChanged(
        address oldPolicyCore,
        address newPolicyCore
    );
    event IncomeMakerProportionChanged(
        uint256 oldProportion,
        uint256 newProportion
    );
    event IncomeMakerAddressChanged(
        address oldIncomeMaker,
        address newIncomeMaker
    );

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    function initialize() public initializer {
        __Ownable_init();
        // 40% of swap fee is distributed to income maker contract
        // Can be set later
        incomeMakerProportion = 40;
    }

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Modifiers ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Only called by policyCore contract
     */
    modifier onlyPolicyCore() {
        require(msg.sender == policyCore, "Only called by policyCore contract");
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Get the all tokens that have been deployed
     * @return tokens All tokens
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    /**
     * @notice Get the INIT_CODE_HASH for policy tokens with parameters
     * @dev For test/task convinience, pre-compute the address
     *      Ethers.js:
     *      Address = ethers.utils.getCreate2Address(factory address, salt, INIT_CODE_HASH)
     *      salt = keccak256(abi.encodePacked(_policyTokenName))
     * @param _tokenName Name of the policy token to be deployed
     * @param _decimals Token decimals of this policy token
     */
    function getInitCodeHashForPolicyToken(
        string memory _tokenName,
        uint256 _decimals
    ) public view returns (bytes32) {
        bytes memory bytecode = _getPolicyTokenBytecode(_tokenName, _decimals);
        return keccak256(bytecode);
    }

    /**
     * @notice Get the pair address deployed by the factory
     *         PolicyToken address first, and then stablecoin address
     *         The order of the tokens will be sorted inside the function
     * @param _tokenAddress1 Address of token1
     * @param _tokenAddress2 Address of toekn2
     * @return Pool address of the two tokens
     */
    function getPairAddress(address _tokenAddress1, address _tokenAddress2)
        public
        view
        returns (address)
    {
        // Policy token address at the first place
        (address token0, address token1) = IPolicyCore(policyCore)
            .supportedStablecoin(_tokenAddress2)
            ? (_tokenAddress1, _tokenAddress2)
            : (_tokenAddress2, _tokenAddress1);

        address _pairAddress = getPair[token0][token1];

        return _pairAddress;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Set Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Remember to call this function to set the policyCore address
     * @dev    Only callable by the owner
     *         < PolicyCore should be the minter of policyToken >
     *         < This process is done inside constructor >
     * @param _policyCore Address of policyCore contract
     */
    function setPolicyCoreAddress(address _policyCore) external onlyOwner {
        emit PolicyCoreAddressChanged(policyCore, _policyCore);
        policyCore = _policyCore;
    }

    /**
     * @notice Set income maker proportion
     * @dev    Only callable by the owner
     * @param _proportion New proportion to income maker contract
     */
    function setIncomeMakerProportion(uint256 _proportion) external onlyOwner {
        emit IncomeMakerProportionChanged(incomeMakerProportion, _proportion);
        incomeMakerProportion = _proportion;
    }

    /**
     * @notice Set income maker address
     * @dev Only callable by the owner
     * @param _incomeMaker New income maker address
     */
    function setIncomeMakerAddress(address _incomeMaker) external onlyOwner {
        emit IncomeMakerAddressChanged(incomeMaker, _incomeMaker);
        incomeMaker = _incomeMaker;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Main Functions *********************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice For each round we need to first create the policytoken(ERC20)
     * @param _policyTokenName Name of the policyToken
     * @param _decimals Decimals of the policyToken
     * @return tokenAddress PolicyToken address
     */
    function deployPolicyToken(
        string memory _policyTokenName,
        uint256 _decimals
    ) external onlyPolicyCore returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(_policyTokenName));

        bytes memory bytecode = _getPolicyTokenBytecode(
            _policyTokenName,
            _decimals
        );

        address _policTokenAddress = _deploy(bytecode, salt);

        allTokens.push(_policTokenAddress);

        _nextId++;

        return _policTokenAddress;
    }

    /**
     * @notice After deploy the policytoken and get the address,
     *         we deploy the policyToken - stablecoin pool contract
     * @param _policyTokenAddress Address of policy token
     * @param _stablecoin Address of the stable coin
     * @param _deadline Deadline of the pool
     * @param _feeRate Fee rate given to LP holders
     * @return poolAddress Address of the pool
     */
    function deployPool(
        address _policyTokenAddress,
        address _stablecoin,
        uint256 _deadline,
        uint256 _feeRate
    ) public onlyPolicyCore returns (address) {
        bytes memory bytecode = type(NaughtyPair).creationCode;

        bytes32 salt = keccak256(
            abi.encodePacked(_policyTokenAddress, _stablecoin)
        );

        address _poolAddress = _deploy(bytecode, salt);

        INaughtyPair(_poolAddress).initialize(
            _policyTokenAddress,
            _stablecoin,
            _deadline,
            _feeRate
        );

        getPair[_policyTokenAddress][_stablecoin] = _poolAddress;

        allPairs.push(_poolAddress);

        return _poolAddress;
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Deploy function with create2
     * @param code Byte code of the contract (creation code)
     * @param salt Salt for the deployment
     * @return addr The deployed contract address
     */
    function _deploy(bytes memory code, bytes32 salt)
        internal
        returns (address addr)
    {
        assembly {
            addr := create2(0, add(code, 0x20), mload(code), salt)
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }
    }

    /**
     * @notice Get the policyToken bytecode (with constructor parameters)
     * @param _tokenName Name of policyToken
     * @param _decimals Decimals of policyToken
     */
    function _getPolicyTokenBytecode(
        string memory _tokenName,
        uint256 _decimals
    ) internal view returns (bytes memory) {
        bytes memory bytecode = type(NPPolicyToken).creationCode;

        // Encodepacked the parameters
        // The minter is set to be the policyCore address
        return
            abi.encodePacked(
                bytecode,
                abi.encode(_tokenName, _tokenName, policyCore, _decimals)
            );
    }
}
