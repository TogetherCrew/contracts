// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import {IApplicationManager} from "./IApplicationManager.sol";

contract ApplicationManager is IApplicationManager {
    mapping(uint => Application) private applications;
    uint private nextApplicationId;

    constructor() {}

    function getNextApplicationId() external view returns (uint) {
        return nextApplicationId;
    }

    function createApplication(Application memory application) external {
        applications[nextApplicationId] = application;
        emit ApplicationCreated(nextApplicationId, applications[nextApplicationId]);
        nextApplicationId++;
    }

    function updateApplication(uint id, Application memory application) external override {}

    function deleteApplication(uint id) external override {}

    function getApplication(uint id) external view returns (Application memory) {
        return applications[id];
    }

    function getApplications(uint start, uint limit) external override returns (Application[] memory application) {}
}
