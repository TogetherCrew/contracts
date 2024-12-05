import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ApplicationManager = buildModule("ApplicationManager", (m) => {
	const authority = m.getParameter("authority");
	const contract = m.contract("ApplicationManager", [authority], {});
	return { contract };
});

export default ApplicationManager;
