// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "./OwnableWithoutContext.sol";

/**
 * @title  ERC20 with Multiple Minters and Burners
 * @notice This is contract used for ERC20 tokens that has multiple minters and burners.
 * @dev    The minters and burners are some contracts in Degis that need to issue DEG.
 *         It has basic implementations for ERC20 and also the owner control.
 *         Even if the owner is renounced to zero address, the token can still be minted/burned.
 *         DegisToken and BuyerToken are both this kind ERC20 token.
 */
contract ERC20PermitWithMultipleMinters is ERC20Permit, OwnableWithoutContext {
    // List of all minters
    mapping(address => bool) public isMinter;

    // List of all burners
    mapping(address => bool) public isBurner;

    event MinterAdded(address newMinter);
    event MinterRemoved(address oldMinter);

    event BurnerAdded(address newBurner);
    event BurnerRemoved(address oldBurner);

    event Mint(address indexed account, uint256 amount);
    event Burn(address indexed account, uint256 amount);

    constructor(string memory name, string memory symbol)
        ERC20(name, symbol)
        ERC20Permit(name)
        OwnableWithoutContext(msg.sender)
    {
        // After the owner is transferred to multisig governance
        // This initial minter should be removed
        isMinter[_msgSender()] = true;
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Modifiers ****************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     *@notice Check if the msg.sender is in the minter list
     */
    modifier validMinter(address _sender) {
        require(isMinter[_sender], "Invalid minter");
        _;
    }

    /**
     * @notice Check if the msg.sender is in the burner list
     */
    modifier validBurner(address _sender) {
        require(isBurner[_sender], "Invalid burner");
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Admin Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Add a new minter into the minterList
     * @param _newMinter Address of the new minter
     */
    function addMinter(address _newMinter) external onlyOwner {
        require(!isMinter[_newMinter], "Already a minter");

        isMinter[_newMinter] = true;

        emit MinterAdded(_newMinter);
    }

    /**
     * @notice Remove a minter from the minterList
     * @param _oldMinter Address of the minter to be removed
     */
    function removeMinter(address _oldMinter) external onlyOwner {
        require(isMinter[_oldMinter], "Not a minter");

        isMinter[_oldMinter] = false;

        emit MinterRemoved(_oldMinter);
    }

    /**
     * @notice Add a new burner into the burnerList
     * @param _newBurner Address of the new burner
     */
    function addBurner(address _newBurner) external onlyOwner {
        require(!isBurner[_newBurner], "Already a burner");

        isBurner[_newBurner] = true;

        emit BurnerAdded(_newBurner);
    }

    /**
     * @notice Remove a minter from the minterList
     * @param _oldBurner Address of the minter to be removed
     */
    function removeBurner(address _oldBurner) external onlyOwner {
        require(isMinter[_oldBurner], "Not a burner");

        isBurner[_oldBurner] = false;

        emit BurnerRemoved(_oldBurner);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Mint tokens
     * @param _account Receiver's address
     * @param _amount Amount to be minted
     */
    function mint(address _account, uint256 _amount)
        internal
        validMinter(_msgSender())
    {
        _mint(_account, _amount); // ERC20 method with an event
        emit Mint(_account, _amount);
    }

    /**
     * @notice Burn tokens
     * @param _account address
     * @param _amount amount to be burned
     */
    function burn(address _account, uint256 _amount)
        internal
        validBurner(_msgSender())
    {
        _burn(_account, _amount);
        emit Burn(_account, _amount);
    }
}
