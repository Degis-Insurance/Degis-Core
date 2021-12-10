// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "./Ownable.sol";

/**
 * @title  ERC20 with Multiple Minters and Burners
 * @notice This is contract used for ERC20 tokens that has multiple minters and burners.
 *         It has basic implementations for ERC20 and also the owner control.
 *         Even if the owner is renounced to zero address, the token can still be minted/burned.
 *         DegisToken and BuyerToken are both this kind ERC20 token.
 */
contract ERC20PermitWithMultipleMinters is ERC20Permit, Ownable {
    // List of all minters
    address[] public minterList;
    mapping(address => bool) public isMinter;

    // List of all burners
    address[] public burnerList;
    mapping(address => bool) public isBurner;

    event MinterAdded(address _newMinter);
    event MinterRemoved(address _oldMinter);

    event BurnerAdded(address _newBurner);
    event BurnerRemoved(address _oldBurner);

    event Mint(address indexed _account, uint256 _amount);
    event Burn(address indexed _account, uint256 _amount);

    constructor(string memory name, string memory symbol)
        ERC20(name, symbol)
        ERC20Permit(name)
    {
        _addMinter(_msgSender());
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Modifiers ****************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     *@notice Check if the msg.sender is in the minter list
     */
    modifier inMinterList(address _sender) {
        require(
            isMinter[_sender] == true,
            "Only the address in the minter list can call this function"
        );
        _;
    }

    /**
     * @notice Check if the msg.sender is in the burner list
     */
    modifier inBurnerList(address _sender) {
        require(
            isBurner[_sender] == true,
            "Only the address in the minter list can call this function"
        );
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
        require(
            isMinter[_newMinter] == false,
            "This address is already a minter"
        );

        _addMinter(_newMinter);
    }

    /**
     * @notice Remove a minter from the minterList
     * @param _oldMinter Address of the minter to be removed
     */
    function removeMinter(address _oldMinter) external onlyOwner {
        require(isMinter[_oldMinter] == true, "This address is not a minter");

        uint256 length = minterList.length;
        for (uint256 i = 0; i < length; i++) {
            if (minterList[i] == _oldMinter) {
                for (uint256 j = i; j < length - 1; j++) {
                    minterList[j] = minterList[j + 1];
                }
                minterList.pop();
            } else continue;
        }
        isMinter[_oldMinter] = false;

        emit MinterRemoved(_oldMinter);
    }

    /**
     * @notice Add a new burner into the burnerList
     * @param _newBurner Address of the new burner
     */
    function addBurner(address _newBurner) external onlyOwner {
        require(
            isBurner[_newBurner] == false,
            "This address is already a burner"
        );
        burnerList.push(_newBurner);
        isBurner[_newBurner] = true;

        emit BurnerAdded(_newBurner);
    }

    /**
     * @notice Remove a minter from the minterList
     * @param _oldBurner Address of the minter to be removed
     */
    function removeBurner(address _oldBurner) external onlyOwner {
        require(isMinter[_oldBurner] == true, "This address is not a burner");

        uint256 length = burnerList.length;
        for (uint256 i = 0; i < length; i++) {
            if (burnerList[i] == _oldBurner) {
                for (uint256 j = i; j < length - 1; j++) {
                    burnerList[j] = burnerList[j + 1];
                }
                burnerList.pop();
            } else continue;
        }
        isBurner[_oldBurner] = false;

        emit BurnerRemoved(_oldBurner);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Main Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Mint tokens
     * @param _account Receiver's address
     * @param _amount Amount to be minted
     */
    function mint(address _account, uint256 _amount)
        internal
        inMinterList(_msgSender())
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
        inBurnerList(_msgSender())
    {
        _burn(_account, _amount);
        emit Burn(_account, _amount);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Finish the process of adding a new minter.
     * @dev    Also used in constructor.
     */
    function _addMinter(address _newMinter) internal {
        minterList.push(_newMinter);
        isMinter[_newMinter] = true;
        emit MinterAdded(_newMinter);
    }
}
