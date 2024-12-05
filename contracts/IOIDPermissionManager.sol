// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

interface IOIDPermissionManager {
    event PermissionUpdated(bytes32 key, address account, bool granted);
    function grantPermission(bytes32 attestation_uid,  address account) external;
    function revokePermission(bytes32 attestation_uid,  address account) external;
    function hasPermission(
        bytes32 key, 
        address account
    ) external view returns (bool);
}