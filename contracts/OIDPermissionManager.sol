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

    struct Permission {
        bool granted;
        bytes32 attestation_uid;
    }
    IEAS internal immutable _eas;

    // mapping(bytes32 => mapping(address => bool)) private permissions;
    mapping(bytes32 => mapping(address => Permission)) private permissions;

    constructor(
        address initialAuthority,
        IEAS initialEAS
    ) AccessManaged(initialAuthority) {
        _eas = initialEAS;
    }


    function grantPermission(bytes32 attestation_uid, address account) external {
        Attestation memory attestation = _eas.getAttestation(attestation_uid);
        _checkValid(attestation);
        bytes32 key =decodePayload(attestation.data);
        permissions[key][account] = Permission({
            granted: true,
         attestation_uid: attestation_uid
        });
        // permissions[key][account] = true;
        emit PermissionUpdated(key, account, true);
    }


    function revokePermission(bytes32 attestation_uid, address account) external override {
        Attestation memory attestation = _eas.getAttestation(attestation_uid);
        _checkValid(attestation);
        bytes32 key = decodePayload(attestation.data);
        permissions[key][account] = Permission({
            granted: false,
            attestation_uid: attestation_uid
        });
        // permissions[key][account] = false;
        emit PermissionUpdated(key, account, false);
    }

    function hasPermission(bytes32 key,address account) external view override returns (bool) {
        // return permissions[key][account];
        Attestation memory attestation = _eas.getAttestation(permissions[key][account].attestation_uid);

        if (attestation.revocationTime == 0) {
            return permissions[key][account].granted;
        } else {
            return false;
        }

    }

    function _checkValid(Attestation memory attestation) internal view {
        bool valid = _isAttestationRecipient(attestation) || _isPermissionManager();

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

    function _isAttestationRecipient(Attestation memory attestation) internal view returns (bool) {
        return attestation.recipient == msg.sender;
    }

     function decodePayload(bytes memory payload) internal pure returns (bytes32) {
        // (bytes32 key, string memory provider, string memory secret) = abi.decode(payload, (bytes32, string, string));
        bytes32 key = abi.decode(payload, (bytes32));
        return key;
    }

    function eas() external view returns (IEAS) {
        return _eas;
    }

}
