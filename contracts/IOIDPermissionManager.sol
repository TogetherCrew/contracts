// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

interface IOIDPermissionManager {
    event PermissionUpdated(bytes32 uid, address account, bool granted);

    function grantPermission(bytes32 uid, address account) external;

    function revokePermission(bytes32 uid, address account) external;

    function hasPermission(
        bytes32 uid,
        address account
    ) external view returns (bool);
}
