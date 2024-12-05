// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;
import {IOIDPermissionManager} from "./IOIDPermissionManager.sol";
import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import {IEAS} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import {Attestation} from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";
import {IAccessManager} from "@openzeppelin/contracts/access/manager/IAccessManager.sol";
import {OIDAccessManager} from "./OIDAccessManager.sol";

contract OIDPermissionManager is IOIDPermissionManager, AccessManaged {
    error UnauthorizedAccess(address caller);
    error AttestationNotFound(bytes32 attestation_uid);
    error AttestationRevoked(bytes32 attestation_uid);

    struct Permission {
        bool granted;
        bytes32 attestation_uid;
    }
    IEAS internal immutable _eas;

    mapping(bytes32 => mapping(address => Permission)) private permissions;

    constructor(
        address initialAuthority,
        IEAS initialEAS
    ) AccessManaged(initialAuthority) {
        _eas = initialEAS;
    }


    function grantPermission(bytes32 attestation_uid, address account) external {
        _updatePermission(attestation_uid, account, true);
    }


    function revokePermission(bytes32 attestation_uid, address account) external override {
        _updatePermission(attestation_uid, account, false);
    }
    
    function hasPermission(bytes32 key,address account) external view override returns (bool) {
        Permission storage permission = permissions[key][account];
        if (!_permissionExists(permission) || !permission.granted) {
            return false;
        }
        Attestation memory attestation = _getAttestation(permission.attestation_uid);
        if (_isAttestationRevoked(attestation)) {
            return false;
        }   
        return true;
    }


    function _updatePermission(bytes32 attestation_uid, address account, bool granted) internal {
        Attestation memory attestation = _getAttestation(attestation_uid);
        if (_isAttestationRevoked(attestation)) {
            revert AttestationRevoked(attestation_uid);
        }   
        _checkAuthorization(attestation);
        bytes32 key = _decodeAttestationKey(attestation);
        _setPermission(key, account, granted, attestation_uid);
        emit PermissionUpdated(key, account, granted);
    }

    function _checkAuthorization(Attestation memory attestation) internal view {
      if (!_isAttestationRecipient(attestation) && !_isPermissionManager()) {
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


    function _permissionExists(Permission storage permission) internal view returns (bool) {
        return permission.attestation_uid != bytes32(0);
    }

    function _setPermission(
    bytes32 key,
    address account,
    bool granted,
    bytes32 attestation_uid
    ) internal {
         permissions[key][account] = Permission({
        granted: granted,
        attestation_uid: attestation_uid
    });
    }

    function _getAttestation(bytes32 attestation_uid) private view returns (Attestation memory) {
        Attestation memory attestation = _eas.getAttestation(attestation_uid);
         if (attestation.uid == bytes32(0)) {
            revert AttestationNotFound(attestation_uid);
         }
         return attestation;  
    }

    function _isAttestationRecipient(Attestation memory attestation) internal view returns (bool) {
        return attestation.recipient == msg.sender;
    }

    function _isAttestationRevoked(Attestation memory attestation) internal pure returns (bool) {
        return attestation.revocationTime != 0;
    }

    function eas() external view returns (IEAS) {
        return _eas;
    }

    
    function _decodeAttestationKey(Attestation memory attestation) internal pure returns (bytes32) {
        bytes32 key = abi.decode(attestation.data, (bytes32));
        return key;
    }

}
