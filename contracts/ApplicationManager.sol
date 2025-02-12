// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {IApplicationManager} from "./IApplicationManager.sol";
import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ApplicationManager is
    IApplicationManager,
    AccessManaged,
    ReentrancyGuard
{
    mapping(uint => Application) private applications;
    mapping(address => bool) private addressUsed;
    uint private nextApplicationId;

    constructor(address initialAuthority) AccessManaged(initialAuthority) {}

    function applicationExists(uint id) internal view returns (bool) {
        return applications[id].account != address(0);
    }

    function getNextApplicationId() external view returns (uint) {
        return nextApplicationId;
    }

    function createApplication(
        ApplicationDto memory dto
    ) external nonReentrant restricted {
        require(
            !addressUsed[dto.account],
            "Address already used for another application"
        );
        uint id = nextApplicationId;
        nextApplicationId++;
        Application memory newApplication = Application({
            id: id,
            name: dto.name,
            account: dto.account
        });
        applications[id] = newApplication;
        addressUsed[newApplication.account] = true;
        emit ApplicationCreated(id, applications[id]);
    }

    function updateApplication(
        uint id,
        ApplicationDto memory dto
    ) external nonReentrant restricted {
        require(applicationExists(id), "Application does not exist");
        require(
            !addressUsed[dto.account] ||
                applications[id].account == dto.account,
            "Account used by another application"
        );
        applications[id] = Application({
            id: id,
            name: dto.name,
            account: dto.account
        });
        emit ApplicationUpdated(id, applications[id]);
    }

    function deleteApplication(uint id) external nonReentrant restricted {
        require(applicationExists(id), "Application does not exist");
        addressUsed[applications[id].account] = false;
        emit ApplicationDeleted(id, applications[id]);
        delete applications[id];
    }

    function getApplication(
        uint id
    ) external view returns (Application memory) {
        require(applicationExists(id), "Application does not exist");
        return applications[id];
    }

    function getApplications(
        uint start,
        uint limit
    ) external view returns (Application[] memory) {
        Application[] memory result = new Application[](limit);
        uint count = 0;
        uint index = start;
        while (count < limit && index < nextApplicationId) {
            if (applicationExists(index)) {
                result[count] = applications[index];
                count++;
            }
            index++;
        }

        Application[] memory finalResult = new Application[](count);
        for (uint i = 0; i < count; i++) {
            finalResult[i] = result[i];
        }
        return finalResult;
    }
}
