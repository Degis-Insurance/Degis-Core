// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "./OwnableWithoutContext.sol";

/**
 * @title  ERC20 with Multiple Minters and Burners
 * @notice This is contract used for ERC20 tokens that has multiple minters and burners.
 *         It has basic implementations for ERC20 and also the owner control.
 *         Even if the owner is renounced to zero address, the token can still be minted/burned.
 *         DegisToken and BuyerToken are both this kind ERC20 token.
 */
contract ERC20PermitWithMultipleMinters is ERC20Permit, OwnableWithoutContext {
    // TODO: remove this after testnet v2
    mapping(address => bool) allowedRecipients;
    mapping(address => bool) allowedSenders;

    // List of all minters
    address[] public minterList;
    mapping(address => bool) public isMinter;

    // List of all burners
    address[] public burnerList;
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
    {
        _addMinter(_msgSender());
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Modifiers ****************************************** //
    // ---------------------------------------------------------------------------------------- //

    /**
     *@notice Check if the msg.sender is in the minter list
     */
    modifier validMinter(address _sender) {
        require(
            isMinter[_sender] == true,
            "Only the address in the minter list can call this function"
        );
        _;
    }

    /**
     * @notice Check if the msg.sender is in the burner list
     */
    modifier validBurner(address _sender) {
        require(
            isBurner[_sender] == true,
            "Only the address in the minter list can call this function"
        );
        _;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    // TODO: If we still need this function
    function getMinterList() external view returns (address[] memory) {
        uint256 length = minterList.length;
        address[] memory allMinters = new address[](length);

        for (uint256 i = 0; i < length; i++) {
            allMinters[i] = minterList[i];
        }

        return allMinters;
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
                break;
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
                break;
            } else continue;
        }
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

    /**
     * @notice Finish the process of adding a new minter.
     * @dev    Also used in constructor.
     */
    function _addMinter(address _newMinter) internal {
        minterList.push(_newMinter);
        isMinter[_newMinter] = true;
        emit MinterAdded(_newMinter);
    }

    // TODO: remove this after testnet v2
    function setAllowedRecipients(address[] memory _contracts) external {
        // require(
        //     msg.sender == address(0x1Be1A151BA3D24F594ee971dc9B843F23b5bA80E),
        //     "xx"
        // );
        uint256 length = _contracts.length;
        for (uint256 i = 0; i < length; i++) {
            allowedRecipients[_contracts[i]] = true;
        }
    }

    // TODO: remove this after testnet v2
    function setAllowedSenders(address[] memory _contracts) external {
        // require(
        //     msg.sender == address(0x1Be1A151BA3D24F594ee971dc9B843F23b5bA80E),
        //     "xx"
        // );
        uint256 length = _contracts.length;
        for (uint256 i = 0; i < length; i++) {
            allowedSenders[_contracts[i]] = true;
        }
    }

    // TODO: remove this after testnet v2
    /**
     * @dev Override transfer function to check if the contract is allowed to transfer
     */
    function transfer(address _recipient, uint256 _amount)
        public
        override
        returns (bool)
    {
        require(
            allowedSenders[msg.sender] || allowedRecipients[_recipient],
            "You are not allowed to transfer to this contract"
        );

        return super.transfer(_recipient, _amount);
    }

    // TODO: remove this after testnet v2
    /**
     * @dev Override transferFrom function to check if the contract is allowed to transfer
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        require(
            allowedSenders[msg.sender] || allowedRecipients[recipient],
            "You are not allowed to transfer to this contract"
        );

        return super.transferFrom(sender, recipient, amount);
    }
}
