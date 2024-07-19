// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

interface IApplicationManager {
    struct Application {
        string name;
        address account;
    }

    event ApplicationCreated(uint id, Application application);
    event ApplicationUpdated(uint id, Application application);
    event ApplicationDeleted(uint id, Application application);

    function nextApplicationId() external view returns (uint);

    function createApplication(Application memory _application) external;

    function updateApplication(
        uint _id,
        Application memory _application
    ) external;

    function deleteApplication(uint _id) external;

    function getApplication(
        uint _id
    ) external view returns (Application memory);

    function getApplications(
        uint _start,
        uint _limit
    ) external returns (Application[] memory application);
}
