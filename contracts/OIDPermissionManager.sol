// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;
import {IOIDPermissionManager} from "./IOIDPermissionManager.sol";
import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import {IAccessManager} from "@openzeppelin/contracts/access/manager/IAccessManager.sol";
import {OIDAccessManager} from "./OIDAccessManager.sol";

contract OIDPermissionManager is IOIDPermissionManager, AccessManaged {
    error UnauthorizedAccess(address caller);


    mapping(bytes32 => mapping(address => bool)) private permissions;

    constructor(
        address initialAuthority
    ) AccessManaged(initialAuthority) {
    }

    function grantPermission(bytes32 key, address account) external {
        _checkValid();
        permissions[key][account] = true;
        emit PermissionUpdated(key, account, true);
    }


    function revokePermission(bytes32 key, address account) external override {
        _checkValid();
        permissions[key][account] = false;
        emit PermissionUpdated(key, account, false);
    }

    function hasPermission(bytes32 key,address account) external view override returns (bool) {
        return permissions[key][account];
    }


    function _checkValid() internal view {
        bool valid = _isPermissionManager();
        if (!valid) {
            revert UnauthorizedAccess(msg.sender);
        }
    }


    function _isPermissionManager() internal view returns (bool) {
        OIDAccessManager access = OIDAccessManager(authority());
        (bool isMember, ) = access.hasRole(
            access.PERMISSION_MANAGER_ROLE(),
            msg.sender
        );
        return isMember;
    }

}
