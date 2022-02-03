// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../utils/ERC20.sol";

/**
 * @title  Policy Token for Naughty Price
 * @notice This is the contract for token price policy token.
 *         It is a ERC20 token with an owner and a minter.
 *         The owner should be the deployer at first.
 *         The minter should be the policyCore contract.
 * @dev    It is different from the flight delay token.
 *         That is an ERC721 NFT and this is an ERC20 token.
 */
contract NPPolicyToken is ERC20 {
    // ---------------------------------------------------------------------------------------- //
    // ************************************* Variables **************************************** //
    // ---------------------------------------------------------------------------------------- //

    address public minter;

    // ---------------------------------------------------------------------------------------- //
    // *************************************** Events ***************************************** //
    // ---------------------------------------------------------------------------------------- //

    event Mint(address account, uint256 amount);
    event Burn(address account, uint256 amount);

    constructor(
        string memory _name,
        string memory _symbol,
        address _minter
    ) ERC20(_name, _symbol) {
        minter = _minter;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Modifiers **************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Only the minter can mint
     */
    modifier onlyMinter() {
        require(msg.sender == minter, "only minter can call this function");
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Main Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Mint some policy tokens
     * @param _account Address to receive the tokens
     * @param _amount Amount to be minted
     */
    function mint(address _account, uint256 _amount) public onlyMinter {
        _mint(_account, _amount);
        emit Mint(_account, _amount);
    }

    /**
     * @notice Burn some policy tokens
     * @param _account Address to burn tokens
     * @param _amount Amount to be burned
     */
    function burn(address _account, uint256 _amount) public onlyMinter {
        _burn(_account, _amount);
        emit Burn(_account, _amount);
    }
}
