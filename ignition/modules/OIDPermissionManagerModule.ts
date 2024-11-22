import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OIDPermissionManager = buildModule("OIDPermissionManager", (m) => {
	const initialAuthority = m.getParameter("initialAuthority");
	const initialEAS = m.getParameter("initialEAS");
	const contract = m.contract(
		"OIDPermissionManager",
		[initialAuthority, initialEAS],
		{},
	);
	return { contract };
});

export default OIDPermissionManager;
