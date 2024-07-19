// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import {IApplicationManager} from "./IApplicationManager.sol";

contract ApplicationManager is IApplicationManager {
    mapping(uint => Application) private applications_;
    uint private nextApplicationId_;

    constructor() {}

    function nextApplicationId() external view returns (uint) {
        return nextApplicationId_;
    }

    function createApplication(Application memory _application) external {
        applications_[nextApplicationId_] = _application;
        emit ApplicationCreated(
            nextApplicationId_,
            applications_[nextApplicationId_]
        );
        nextApplicationId_++;
    }

    function updateApplication(
        uint _id,
        Application memory _application
    ) external override {}

    function deleteApplication(uint _id) external override {}

    function getApplication(
        uint _id
    ) external view returns (Application memory) {
        return applications_[_id];
    }

    function getApplications(
        uint _start,
        uint _limit
    ) external override returns (Application[] memory application) {}
}
