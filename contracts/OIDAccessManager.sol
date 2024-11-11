// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

// solhint-disable-next-line max-line-length
import {AccessManagerUpgradeable} from "@openzeppelin/contracts-upgradeable/access/manager/AccessManagerUpgradeable.sol";

contract OIDAccessManager is AccessManagerUpgradeable {
    uint64 public constant APPLICATION_MANAGER_ROLE = 1;
    uint64 public constant ATTESTATION_MANAGER_ROLE = 2;
    uint64 public constant PERMISSION_MANAGER_ROLE = 3;

    function initialize() public initializer {
        __AccessManager_init(msg.sender);
    }
}
