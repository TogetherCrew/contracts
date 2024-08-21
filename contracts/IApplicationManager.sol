// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

interface IApplicationManager {
    struct ApplicationDto {
        string name;
        address account;
    }

    struct Application {
        uint id;
        string name;
        address account;
    }

    event ApplicationCreated(uint id, Application application);
    event ApplicationUpdated(uint id, Application application);
    event ApplicationDeleted(uint id, Application application);

    function getNextApplicationId() external view returns (uint);

    function createApplication(ApplicationDto memory dto) external;

    function updateApplication(uint id, ApplicationDto memory dto) external;

    function deleteApplication(uint id) external;

    function getApplication(uint id) external view returns (Application memory);

    function getApplications(
        uint start,
        uint limit
    ) external returns (Application[] memory);
}
