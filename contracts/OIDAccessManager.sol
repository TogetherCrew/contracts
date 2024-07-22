// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

// solhint-disable-next-line max-line-length
import {AccessManagerUpgradeable} from "@openzeppelin/contracts-upgradeable/access/manager/AccessManagerUpgradeable.sol";

contract OIDAccessManager is AccessManagerUpgradeable {
    function initialize() public initializer {
        __AccessManager_init(msg.sender);
    }
}
