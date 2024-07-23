// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {IEAS} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import {Attestation} from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";
import {SchemaResolver} from "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import {AccessManagedUpgradeable} from "@openzeppelin/contracts-upgradeable/access/manager/AccessManagedUpgradeable.sol";

contract OIDResolver is SchemaResolver, AccessManagedUpgradeable {
    constructor(IEAS initialEAS) SchemaResolver(initialEAS) {}

    function initialize(address initialAuthority) public initializer {
        __AccessManaged_init(initialAuthority);
    }

    function onAttest(
        Attestation calldata attestation,
        uint256 value
    ) internal virtual override returns (bool) {}

    function onRevoke(
        Attestation calldata attestation,
        uint256 value
    ) internal virtual override returns (bool) {}

    function eas() public view returns (IEAS) {
        return _eas;
    }
}
