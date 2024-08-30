import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OIDResolver = buildModule("OIDResolver", (m) => {
	const eas = m.getParameter("eas");
	const authority = m.getParameter("authority");
	const contract = m.contract("OIDResolver", [eas], {});
	m.call(contract, "initialize", [authority]);
	return { contract };
});

export default OIDResolver;
