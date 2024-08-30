// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {IOIDPermissionManager} from "./IOIDPermissionManager.sol";
import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import {IEAS} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import {Attestation} from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";
import {IAccessManager} from "@openzeppelin/contracts/access/manager/IAccessManager.sol";

contract OIDPermissionManager is IOIDPermissionManager, AccessManaged {
    error UnauthorizedAccess(address caller);

    IEAS internal immutable _eas;

    mapping(bytes32 => mapping(address => bool)) private permissions;

    constructor(
        address initialAuthority,
        IEAS initialEAS
    ) AccessManaged(initialAuthority) {
        _eas = initialEAS;
    }

    function grantPermission(bytes32 uid, address account) external {
        _checkValid(uid);
        permissions[uid][account] = true;
        emit PermissionUpdated(uid, account, true);
    }

    function revokePermission(bytes32 uid, address account) external override {
        _checkValid(uid);
        permissions[uid][account] = false;
        emit PermissionUpdated(uid, account, false);
    }

    function hasPermission(
        bytes32 uid,
        address account
    ) external view override returns (bool) {
        Attestation memory attestation = _eas.getAttestation(uid);

        if (attestation.revocationTime == 0) {
            return permissions[uid][account];
        } else {
            return false;
        }
    }

    function eas() external view returns (IEAS) {
        return _eas;
    }

    function _checkValid(bytes32 uid) internal view {
        bool valid = _isAttestationRecipient(uid) || _isPermissionManager();

        if (!valid) {
            revert UnauthorizedAccess(msg.sender);
        }
    }

    function _isAttestationRecipient(bytes32 uid) internal view returns (bool) {
        Attestation memory attestation = _eas.getAttestation(uid);
        return attestation.recipient == msg.sender;
    }

    function _isPermissionManager() internal view returns (bool) {
        (bool isMember, ) = IAccessManager(authority()).hasRole(3, msg.sender);
        return isMember;
    }

    // function _isApplication(address account) internal view returns (bool) {
    //     return msg.sender == account;
    // }
}
