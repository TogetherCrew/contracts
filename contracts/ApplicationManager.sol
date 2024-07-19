// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {IApplicationManager} from "./IApplicationManager.sol";

contract ApplicationManager is IApplicationManager {
    mapping(uint => Application) private applications;
    mapping(address => bool) private addressUsed;
    uint private nextApplicationId;

    constructor() {}

    function applicationExists(uint id) internal view returns (bool) {
        return applications[id].account != address(0);
    }
    function getNextApplicationId() external view override returns (uint) {
        return nextApplicationId;
    }

    function createApplication(Application memory application) external override {
        require(!addressUsed[application.account], "Address already used for another application");
        applications[nextApplicationId] = application;
        addressUsed[application.account] = true;
        emit ApplicationCreated(nextApplicationId, applications[nextApplicationId]);
        nextApplicationId++;
    }

    function updateApplication(uint id, Application memory application) external override {
        require(applicationExists(id), "Application does not exist");
        require(!addressUsed[application.account] || applications[id].account == application.account,
            "Address already used for another application");
        applications[id] = application;
        emit ApplicationUpdated(id, applications[id]);
    }

    function deleteApplication(uint id) external override {
        require(applicationExists(id), "Application does not exist");
        addressUsed[applications[id].account] = false;
        emit ApplicationDeleted(id, applications[id]);
        delete applications[id];
    }

    function getApplication(uint id) external view override returns (Application memory) {
        require(applicationExists(id), "Application does not exist");
        return applications[id];
    }

    function getApplications(uint start, uint limit) external view override returns (Application[] memory) {
    }


}
