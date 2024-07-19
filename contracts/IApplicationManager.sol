// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

interface IApplicationManager {
    struct Application {
        string name;
        address account;
    }

    event ApplicationCreated(uint id, Application application);
    event ApplicationUpdated(uint id, Application application);
    event ApplicationDeleted(uint id, Application application);

    function getNextApplicationId() external view returns (uint);
    function createApplication(Application memory application) external;
    function updateApplication(uint id, Application memory application) external;
    function deleteApplication(uint id) external;
    function getApplication(uint id) external view returns (Application memory);
    function getApplications(uint start, uint limit) external returns (Application[] memory);
}
