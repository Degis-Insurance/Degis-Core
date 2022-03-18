// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "../utils/OwnableWithoutContext.sol";
import "../libraries/StringsUtils.sol";
import "./interfaces/IPolicyFlow.sol";
import "./interfaces/IPolicyStruct.sol";

/**
 * @title  Policy Token for flight delay
 * @notice ERC721 policy token
 *         Can get a long string form of the tokenURI
 *         When the ownership is transferred, it will update the status in policyFlow
 */
contract FDPolicyToken is
    ERC721Enumerable,
    IPolicyStruct,
    OwnableWithoutContext
{
    using StringsUtils for uint256;
    using StringsUtils for address;

    // PolicyFlow contract interface
    IPolicyFlow public policyFlow;

    uint256 public _nextId;

    struct PolicyTokenURIParam {
        string flightNumber;
        address owner;
        uint256 premium;
        uint256 payoff;
        uint256 purchaseTimestamp;
        uint256 departureTimestamp;
        uint256 landingTimestamp;
        uint256 status;
    }

    event PolicyFlowUpdated(address newPolicyFlow);

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor()
        ERC721("Degis FlightDelay PolicyToken", "DEGIS_FD_PT")
        OwnableWithoutContext(msg.sender)
    {
        _nextId = 1;
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************ View Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Get the tokenURI of a policy
     * @param _tokenId Token Id of the policy token
     * @return The tokenURI in string form
     */
    function tokenURI(uint256 _tokenId)
        public
        view
        override(ERC721)
        returns (string memory)
    {
        require(_tokenId < _nextId, "TokenId is too large!");
        return _getTokenURI(_tokenId);
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Set Functions ************************************ //
    // ---------------------------------------------------------------------------------------- //

    /**
       @notice Update the policyFlow address if it has been updated
       @param _policyFlow New policyFlow contract address
     */
    function updatePolicyFlow(address _policyFlow) external onlyOwner {
        policyFlow = IPolicyFlow(_policyFlow);
        emit PolicyFlowUpdated(_policyFlow);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Main Functions ************************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Mint a new policy token to an address
     * @param _to The receiver address
     */
    function mintPolicyToken(address _to) public {
        require(
            _msgSender() == address(policyFlow),
            "Only the policyflow contract can mint fd policy token"
        );
        uint256 tokenId = _nextId++;
        _safeMint(_to, tokenId);
    }

    /**
     * @notice Transfer the owner of a policy token and update the information in policyFlow
     * @dev Need approval and is prepared for secondary market
     * @dev If you just transfer the policy token, you will not transfer the right for claiming payoff
     * @param _from The original owner of the policy
     * @param _to The new owner of the policy
     * @param _tokenId Token id of the policy
     */
    function transferOwner(
        address _from,
        address _to,
        uint256 _tokenId
    ) public {
        safeTransferFrom(_from, _to, _tokenId);
        policyFlow.policyOwnerTransfer(_tokenId, _from, _to);
    }

    // ---------------------------------------------------------------------------------------- //
    // *********************************** Internal Functions ********************************* //
    // ---------------------------------------------------------------------------------------- //

    /**
     * @notice Get the tokenURI, the metadata is from policyFlow contract
     * @param _tokenId Token Id of the policy token
     */
    function _getTokenURI(uint256 _tokenId)
        internal
        view
        returns (string memory)
    {
        PolicyInfo memory info = policyFlow.getPolicyInfoById(_tokenId);

        return
            _constructTokenURI(
                PolicyTokenURIParam(
                    info.flightNumber,
                    info.buyerAddress,
                    info.premium,
                    info.payoff,
                    info.purchaseTimestamp,
                    info.departureTimestamp,
                    info.landingTimestamp,
                    uint256(info.status)
                )
            );
    }

    /**
     * @notice Construct the metadata of a specific policy token
     * @param _params The parameters of the policy token
     */
    function _constructTokenURI(PolicyTokenURIParam memory _params)
        internal
        pure
        returns (string memory)
    {
        string[9] memory parts;

        parts[0] = "ProductId: 0, ";
        parts[1] = string(
            abi.encodePacked("FlightNumber: ", _params.flightNumber, ", ")
        );
        parts[2] = string(
            abi.encodePacked(
                "BuyerAddress: ",
                (_params.owner).addressToString(),
                ", "
            )
        );

        parts[3] = string(
            abi.encodePacked(
                "Premium: ",
                (_params.premium / 1e18).uintToString(),
                ", "
            )
        );

        parts[4] = string(
            abi.encodePacked(
                "Payoff: ",
                (_params.payoff / 1e18).uintToString(),
                ", "
            )
        );

        parts[5] = string(
            abi.encodePacked(
                "PurchaseTimestamp: ",
                _params.purchaseTimestamp.uintToString(),
                ", "
            )
        );

        parts[6] = string(
            abi.encodePacked(
                "DepartureTimestamp:",
                _params.departureTimestamp.uintToString(),
                ", "
            )
        );

        parts[7] = string(
            abi.encodePacked(
                "LandingTimestamp: ",
                (_params.landingTimestamp).uintToString(),
                ", "
            )
        );

        parts[8] = string(
            abi.encodePacked(
                "PolicyStatus: ",
                _params.status.uintToString(),
                "."
            )
        );

        string memory output = string(
            abi.encodePacked(
                parts[0],
                parts[1],
                parts[2],
                parts[3],
                parts[4],
                parts[5],
                parts[6],
                parts[7],
                parts[8]
            )
        );
        return output;
    }
}
