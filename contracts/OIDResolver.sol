// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {IEAS} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import {Attestation} from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";
import {SchemaResolver} from "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import {AccessManagedUpgradeable} from "@openzeppelin/contracts-upgradeable/access/manager/AccessManagedUpgradeable.sol";
import {IAccessManager} from "@openzeppelin/contracts/access/manager/IAccessManager.sol";

import "hardhat/console.sol";

contract OIDResolver is SchemaResolver, AccessManagedUpgradeable {
    error UnauthorizedAttester(address attester);

    constructor(IEAS initialEAS) SchemaResolver(initialEAS) {}

    modifier checkAttester(address attester) {
        _checkAttester(attester);
        _;
    }

    function initialize(address initialAuthority) public initializer {
        __AccessManaged_init(initialAuthority);
    }

    function onAttest(
        Attestation calldata attestation,
        uint256 value
    )
        internal
        virtual
        override
        checkAttester(attestation.attester)
        returns (bool)
    {
        return true;
    }

    function onRevoke(
        Attestation calldata attestation,
        uint256 value
    ) internal virtual override returns (bool) {
        return true;
    }

    function eas() public view returns (IEAS) {
        return _eas;
    }

    function _checkAttester(address attester) internal virtual {
        (bool isMember, ) = IAccessManager(authority()).hasRole(1, attester);
        if (!isMember) {
            revert UnauthorizedAttester(attester);
        }
    }
}
