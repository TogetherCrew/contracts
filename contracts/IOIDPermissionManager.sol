// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

interface IOIDPermissionManager {
    event PermissionUpdated(string hash, address account, bool granted);
    event PermissionDeleted(string hash, address account, bool granted);

    function grantPermission(string memory hash, address account) external;

    function revokePermission(string memory hash, address account) external;

    function hasPermission(
        string memory hash,
        address account
    ) external view returns (bool);
}
