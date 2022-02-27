// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;
import "./NPPolicyToken.sol";
import "./NaughtyPair.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/INaughtyPair.sol";
import "./interfaces/IPolicyCore.sol";
import "../libraries/StringsUtils.sol";
import "../utils/OwnableWithoutContext.sol";

/**
 * @title Naughty Factory
 * @dev Factory contract to deploy new pools periodically
 *      Each pool(product) will have a unique naughtyId
 *      Each pool will have its pool token
 *      PolicyToken - Stablecoin
 *      Token 0 may change but Token 1 is always stablecoin.
 */

contract NaughtyFactory is OwnableWithoutContext {
    using StringsUtils for address;

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    // PolicyToken Address => StableCoin Address => Pool Address
    mapping(address => mapping(address => address)) getPair;

    // Store all the pairs' addresses
    address[] public allPairs;

    // Store all policy tokens' addresses
    address[] public allTokens;

    uint256 public _nextId;

    // Address of policyCore
    address public policyCore;

    // INIT_CODE_HASH for NaughtyPair, may be used in frontend
    bytes32 public constant PAIR_INIT_CODE_HASH =
        keccak256(abi.encodePacked(type(NaughtyPair).creationCode));

    event PolicyCoreAddressChanged(
        address oldPolicyCore,
        address newPolicyCore
    );

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Modifiers ************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Ensure the policyCore address is already set
     * @dev The naughty pair token may not have minter without this modifier
     */
    modifier alreadySetPolicyCore() {
        require(policyCore != address(0), "Please set the policyCore address");
        _;
    }

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
     * @notice Next token to be deployed
     * @return Latest token address
     */
    function getLatestTokenAddress() external view returns (address) {
        uint256 currentToken = _nextId - 1;
        return allTokens[currentToken];
    }

    /**
     * @notice Get the INIT_CODE_HASH for policy tokens with parameters
     * @param _policyTokenName Name of the policy token to be deployed
     */
    function getInitCodeHashForPolicyToken(string memory _policyTokenName)
        external
        view
        returns (bytes32)
    {
        bytes memory bytecode = type(NPPolicyToken).creationCode;
        return
            keccak256(
                abi.encodePacked(
                    bytecode,
                    abi.encode(_policyTokenName, _policyTokenName, policyCore)
                )
            );
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
     *         < PolicyCore should be the owner of policyToken >
     * @param _policyCore Address of policyCore contract
     */
    function setPolicyCoreAddress(address _policyCore) external onlyOwner {
        address oldPolicyCore = policyCore;
        policyCore = _policyCore;
        emit PolicyCoreAddressChanged(oldPolicyCore, _policyCore);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Main Functions *********************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice After deploy the policytoken and get the address,
     *         we deploy the policyToken - stablecoin pool contract
     * @param _policyTokenAddress Address of policy token
     * @param _stablecoin Address of the stable coin
     * @param _deadline Deadline of the pool
     * @param _feeRate Fee rate given to LP holders
     * @return Address of the pool
     */
    function deployPool(
        address _policyTokenAddress,
        address _stablecoin,
        uint256 _deadline,
        uint256 _feeRate
    ) external alreadySetPolicyCore onlyPolicyCore returns (address) {
        bytes memory bytecode = type(NaughtyPair).creationCode;

        bytes32 salt = keccak256(
            abi.encodePacked(
                _policyTokenAddress.addressToString(),
                _stablecoin.addressToString()
            )
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

    /**
     * @notice For each round we need to first create the policytoken(ERC20)
     * @param _policyTokenName Name of the policyToken
     * @return PolicyToken address
     */
    function deployPolicyToken(string memory _policyTokenName)
        external
        alreadySetPolicyCore
        onlyPolicyCore
        returns (address)
    {
        bytes32 salt = keccak256(abi.encodePacked(_policyTokenName));

        bytes memory bytecode = getPolicyTokenBytecode(_policyTokenName);

        address _policTokenAddress = _deploy(bytecode, salt);

        allTokens.push(_policTokenAddress);

        _nextId++;

        return _policTokenAddress;
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Deploy function with create2
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
     * @notice Get the policyToken bytecode (with parameters)
     * @dev It is public for test convinience
     * @param _tokenName Name of policyToken
     */
    function getPolicyTokenBytecode(string memory _tokenName)
        public
        view
        returns (bytes memory)
    {
        bytes memory bytecode = type(NPPolicyToken).creationCode;

        // Encodepacked the parameters
        // The minter is set to be the policyCore address
        return
            abi.encodePacked(
                bytecode,
                abi.encode(_tokenName, _tokenName, policyCore)
            );
    }
}
