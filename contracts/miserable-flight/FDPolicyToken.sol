// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "../utils/Ownable.sol";
import "../libraries/StringsUtils.sol";
import "./interfaces/IPolicyFlow.sol";

/**
 * @title  Policy Token for flight delay
 * @notice ERC721 policy token
 *         Can get a long string form of the tokenURI
 *         When the ownership is transferred, it will update the status in policyFlow
 */
contract FDPolicyToken is ERC721Enumerable, Ownable {
    using StringsUtils for uint256;

    // PolicyFlow contract interface
    IPolicyFlow policyFlow;

    uint256 public _nextId;

    struct PolicyTokenURIParam {
        uint256 productId;
        string flightNumber;
        uint256 policyId;
        address owner;
        uint256 premium;
        uint256 payoff;
        uint256 purchaseDate;
        uint256 departureDate;
        uint256 landingDate;
        uint256 status;
    }

    struct PolicyInfo {
        uint256 productId; // 0: flight delay 1,2,3: future products
        address buyerAddress; // buyer's address
        uint256 policyId; // total order: 0 - N (unique for each policy)(used to link)
        string flightNumber; // Flight number
        uint256 premium; // Premium
        uint256 payoff; // Max payoff
        uint256 purchaseDate; // Unix timestamp (s)
        uint256 departureDate; // Used for buying new applications. Unix timestamp (s)
        uint256 landingDate; // Used for oracle. Unix timestamp (s)
        PolicyStatus status; // INI, SOLD, DECLINED, EXPIRED, CLAIMED
        // Oracle Related
        bool isUsed; // Whether has call the oracle
        uint256 delayResult; // [400:cancelled] [0: on time] [0 ~ 240: delay time] [404: initial]
    }

    // ---------------------------------------------------------------------------------------- //
    // ************************************* Constructor ************************************** //
    // ---------------------------------------------------------------------------------------- //

    constructor() ERC721("Degis_FlightDelay_PolicyToken", "DEGIS_FD_PT") {
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
        require(_tokenId < _nextId, "error, tokenId too large!");
        return getTokenURI(_tokenId);
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
            msg.sender == address(policyFlow),
            "only the policyflow can mint policy token"
        );
        uint256 tokenId = _nextId++;
        _mint(_to, tokenId);
    }

    /**
     * @notice Transfer the owner of a policy token and update the information in policyFlow
     * @dev Need approval and is prepared for secondary market
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
    function getTokenURI(uint256 _tokenId)
        internal
        view
        returns (string memory)
    {
        PolicyInfo memory info = policyFlow.getPolicyInfoById(_tokenId);

        return
            constructTokenURI(
                PolicyTokenURIParam(
                    info.productId,
                    info.flightNumber,
                    info.policyId,
                    info.buyerAddress,
                    info.premium,
                    info.payoff,
                    info.purchaseDate,
                    info.departureDate,
                    info.landingDate,
                    uint256(info.status)
                )
            );
    }

    /**
     * @notice Construct the metadata of a specific policy token
     */
    function constructTokenURI(PolicyTokenURIParam memory _params)
        internal
        pure
        returns (string memory)
    {
        uint256 status = uint256(_params.status);
        return
            string(
                abi.encodePacked(
                    "ProductId: ",
                    _params.productId.toString(),
                    ", ",
                    "FlightNumber: ",
                    _params.flightNumber,
                    "PolicyId: ",
                    _params.policyId.toString(),
                    ", ",
                    "BuyerAddress: ",
                    addressToString(_params.owner),
                    "Premium: ",
                    (_params.premium / 10**18).toString(),
                    ", ",
                    "Payoff: ",
                    (_params.payoff / 10**18).toString(),
                    ", ",
                    "PurchaseDate: ",
                    _params.purchaseDate.toString(),
                    ", ",
                    "DepartureDate:",
                    _params.departureDate.toString(),
                    ", ",
                    "LandingDate: ",
                    _params.landingDate.toString(),
                    ", ",
                    "PolicyStatus: ",
                    status.toString(),
                    "."
                )
            );
    }
}
