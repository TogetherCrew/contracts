// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {IOIDPermissionManager} from "./IOIDPermissionManager.sol";

contract OIDPermissionManager is IOIDPermissionManager {
    mapping(string => mapping(address => bool)) private permissions;

    function grantPermission(string memory hash, address account) external {
        permissions[hash][account] = true;
    }

    function revokePermission(
        string memory hash,
        address account
    ) external override {
        permissions[hash][account] = false;
    }

    function hasPermission(
        string memory hash,
        address account
    ) external view override returns (bool) {
        return permissions[hash][account];
    }
}
