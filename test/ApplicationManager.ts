import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import {
	type Address,
	type WalletClient,
	getAddress,
	parseUnits,
	toFunctionSelector,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

interface Application {
	name: string;
	account: Address;
}

const MANAGER_ROLE = 1n;

const CREATE_APPLICATION_SELECTOR = toFunctionSelector(
	"createApplication((string, address))",
);
const UPDATE_APPLICATION_SELECTOR = toFunctionSelector(
	"updateApplication(uint256, (string, address))",
);
const DELETE_APPLICATION_SELECTOR = toFunctionSelector(
	"deleteApplication(uint256)",
);

function generateRandomAddress(): Address {
	const randomKey = generatePrivateKey();
	const account = privateKeyToAccount(randomKey);
	return account.address;
}

describe("ApplicationManager", () => {
	// We define a fixture to reuse the same setup in every test.
	// We use loadFixture to run this setup once, snapshot that state,
	// and reset Hardhat Network to that snapshot in every test.
	async function deploy() {
		// Contracts are deployed using the first signer/account by default
		const [deployer, manager, otherAccount] = await hre.viem.getWalletClients();

		const access = await hre.viem.deployContract("OIDAccessManager");
		await access.write.initialize();

		await access.write.grantRole([MANAGER_ROLE, manager.account.address, 0]);

		// Assign deployer to MANAGER_ROLE for simplicity
		await access.write.grantRole([MANAGER_ROLE, deployer.account.address, 0]);

		const contract = await hre.viem.deployContract("ApplicationManager", [
			access.address,
		]);

		await access.write.setTargetFunctionRole([
			contract.address,
			[
				CREATE_APPLICATION_SELECTOR,
				UPDATE_APPLICATION_SELECTOR,
				DELETE_APPLICATION_SELECTOR,
			],
			MANAGER_ROLE,
		]);

		const publicClient = await hre.viem.getPublicClient();

		return {
			access,
			contract,
			deployer,
			manager,
			otherAccount,
			publicClient,
		};
	}

	describe("Deployment", () => {
		it("Should set the nextxApplicationId to 0", async () => {
			const { contract } = await loadFixture(deploy);
			expect(await contract.read.getNextApplicationId()).to.equal(
				parseUnits("0", 0),
			);
		});
		it("Should set the authority", async () => {
			const { contract, access } = await loadFixture(deploy);
			expect(await contract.read.authority()).to.equal(
				getAddress(access.address),
			);
		});
	});

	describe("functions", () => {
		const account = generateRandomAddress();
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		let contract: any;

		let app: Application;
		let manager: WalletClient;
		let otherAccount: WalletClient;

		beforeEach(async () => {
			const fixture = await loadFixture(deploy);
			contract = fixture.contract;
			app = {
				name: "app",
				account,
			};
			manager = fixture.manager;
			otherAccount = fixture.otherAccount;
		});

		describe("createApplication", () => {
			describe("Manager", () => {
				it("Should increment nextApplicationId", async () => {
					const applicationId0 = await contract.read.getNextApplicationId();
					expect(applicationId0).to.equal(parseUnits("0", 0));

					await contract.write.createApplication([app], {
						account: manager.account?.address,
					});
					const applicationId1 = await contract.read.getNextApplicationId();
					expect(applicationId1).to.equal(parseUnits("1", 0));
				});
				it("Should revert if the account address is already used", async () => {
					await contract.write.createApplication([app], {
						account: manager.account?.address,
					});
					await expect(
						contract.write.createApplication([app], {
							account: manager.account?.address,
						}),
					).to.be.rejectedWith("Address already used for another application");
				});
				it("Should create a new Application", async () => {
					const applicationId = await contract.read.getNextApplicationId();
					await contract.write.createApplication([app], {
						account: manager.account?.address,
					});
					expect(
						await contract.read.getApplication([applicationId]),
					).to.contain(app);
				});
				it("Should emit the ApplicationCreated event with the new application's details", async () => {
					const applicationId = await contract.read.getNextApplicationId();
					const txHash = await contract.write.createApplication([app], {
						account: manager.account?.address,
					});

					const events = await contract.getEvents.ApplicationCreated();

					expect(events.length).to.be.equal(1);

					const event = events[0];
					expect(event.eventName).to.be.equal("ApplicationCreated");
					expect(event.transactionHash).to.be.equal(txHash);
					expect(event.args.id).to.be.equal(applicationId);
					expect(event.args.application).to.contain(app);
				});
			});

			describe("Other Account", () => {
				it("Should revert with AccessManagedUnauthorized", async () => {
					await expect(
						contract.write.createApplication([app], {
							account: otherAccount.account?.address,
						}),
					).to.be.rejectedWith(
						`AccessManagedUnauthorized("${getAddress(otherAccount.account?.address as Address)}")`,
					);
				});
			});
		});

		describe("updateApplication", () => {
			beforeEach(async () => {
				await contract.write.createApplication([app], {
					account: manager.account?.address,
				});
			});

			describe("Manager", () => {
				it("Should update the application", async () => {
					const applicationId =
						(await contract.read.getNextApplicationId()) - parseUnits("1", 0);
					const newName = "new app name";
					await contract.write.updateApplication(
						[applicationId, { account: app.account, name: newName }],
						{ account: manager.account?.address },
					);
					expect(
						await contract.read.getApplication([applicationId]),
					).to.contain({
						account: app.account,
						name: newName,
					});
				});
				it("Should revert if the account exists", async () => {
					const applicationId1 = await contract.read.getNextApplicationId();
					await contract.write.createApplication(
						[
							{
								account: generateRandomAddress(),
								name: "new app",
							},
						],
						{
							account: manager.account?.address,
						},
					);

					await expect(
						contract.write.updateApplication([applicationId1, app], {
							account: manager.account?.address,
						}),
					).to.be.rejectedWith("Account used by another application");
				});
				it("Should revert if the application does not exist", async () => {
					const nonExistentId = parseUnits("999", 0);
					await expect(
						contract.write.updateApplication([nonExistentId, app], {
							account: manager.account?.address,
						}),
					).to.be.rejectedWith("Application does not exist");
				});
				it("Should emit the ApplicationUpdated event", async () => {
					const applicationId =
						(await contract.read.getNextApplicationId()) - parseUnits("1", 0);
					const txHash = await contract.write.updateApplication(
						[applicationId, app],
						{ account: manager.account?.address },
					);
					const events = await contract.getEvents.ApplicationUpdated();
					expect(events.length).to.be.equal(1);

					const event = events[0];
					expect(event.eventName).to.be.equal("ApplicationUpdated");
					expect(event.transactionHash).to.be.equal(txHash);
					expect(event.args.id).to.be.equal(applicationId);
					expect(event.args.application).to.contain(app);
				});
			});

			describe("Other Account", () => {
				it("Should revert with AccessManagedUnauthorized", async () => {
					const applicationId =
						(await contract.read.getNextApplicationId()) - parseUnits("1", 0);
					const newName = "new app name";
					await expect(
						contract.write.updateApplication(
							[applicationId, { account: app.account, name: newName }],
							{ account: otherAccount.account?.address },
						),
					).to.be.rejectedWith(
						`AccessManagedUnauthorized("${getAddress(otherAccount.account?.address as Address)}")`,
					);
				});
			});
		});

		describe("deleteApplication", () => {
			const applicationId = 0n;

			beforeEach(async () => {
				await contract.write.createApplication([app], {
					account: manager.account?.address,
				});
			});

			describe("Manager", () => {
				it("Should delete the application", async () => {
					await contract.write.deleteApplication([applicationId], {
						account: manager.account?.address,
					});
					await expect(
						contract.read.getApplication([applicationId]),
					).to.be.rejectedWith("Application does not exist");
				});
				it("Should revert if the application does not exist", async () => {
					const nonExistentId = parseUnits("999", 0);
					await expect(
						contract.write.deleteApplication([nonExistentId], {
							account: manager.account?.address,
						}),
					).to.be.rejectedWith("Application does not exist");
				});

				it("Should emit the ApplicationDeleted event", async () => {
					const txHash = await contract.write.deleteApplication(
						[applicationId],
						{ account: manager.account?.address },
					);

					const events = await contract.getEvents.ApplicationDeleted();
					expect(events.length).to.be.equal(1);

					const event = events[0];
					expect(event.eventName).to.be.equal("ApplicationDeleted");
					expect(event.transactionHash).to.be.equal(txHash);
					expect(event.args.id).to.be.equal(applicationId);
					expect(event.args.application).to.contain(app);
				});
			});

			describe("Other Account", () => {
				it("Should revert with AccessManagedUnauthorized", async () => {
					await expect(
						contract.write.deleteApplication([applicationId], {
							account: otherAccount.account?.address,
						}),
					).to.be.rejectedWith(
						`AccessManagedUnauthorized("${getAddress(otherAccount.account?.address as Address)}")`,
					);
				});
			});
		});

		describe("getApplication", () => {
			beforeEach(async () => {
				await contract.write.createApplication([app]);
			});
			it("Should return the application", async () => {
				const applicationId =
					(await contract.read.getNextApplicationId()) - parseUnits("1", 0);
				expect(await contract.read.getApplication([applicationId])).to.contains(
					app,
				);
			});
			it("Should revert if the application does not exist", async () => {
				const nonExistentId = parseUnits("999", 0);
				await expect(
					contract.read.getApplication([nonExistentId]),
				).to.be.rejectedWith("Application does not exist");
			});
		});

		describe("getApplications", () => {
			let apps: Application[];

			beforeEach(async () => {
				apps = [];
				for (let i = 0; i < 8; i++) {
					const app = {
						name: `app${i}`,
						account: generateRandomAddress(),
					};
					await contract.write.createApplication([app]);
					apps.push(app);
				}
			});

			it("Should return an array of Applications.", async () => {
				const start = parseUnits("0", 0);
				const limit = parseUnits("6", 0);
				const returnedApps = await contract.read.getApplications([
					start,
					limit,
				]);
				expect(returnedApps.length).to.equal(6);
				expect(returnedApps).to.deep.include.members([
					apps[0],
					apps[1],
					apps[2],
					apps[3],
					apps[4],
					apps[5],
				]);
			});

			it("Should return fewer than limit entries if there are not enough applications", async () => {
				await contract.write.deleteApplication([parseUnits("7", 0)]);
				const start = parseUnits("6", 0);
				const limit = parseUnits("2", 0);
				const returnedApps = await contract.read.getApplications([
					start,
					limit,
				]);
				expect(returnedApps.length).to.equal(1);
				expect(returnedApps).to.deep.include.members([apps[6]]);
			});

			it("Should return no applications if all within range are deleted", async () => {
				await contract.write.deleteApplication([parseUnits("0", 0)]);
				await contract.write.deleteApplication([parseUnits("1", 0)]);
				await contract.write.deleteApplication([parseUnits("2", 0)]);
				await contract.write.deleteApplication([parseUnits("3", 0)]);
				await contract.write.deleteApplication([parseUnits("4", 0)]);
				await contract.write.deleteApplication([parseUnits("5", 0)]);
				await contract.write.deleteApplication([parseUnits("6", 0)]);
				await contract.write.deleteApplication([parseUnits("7", 0)]);
				const start = parseUnits("0", 0);
				const limit = parseUnits("7", 0);
				const returnedApps = await contract.read.getApplications([
					start,
					limit,
				]);
				expect(returnedApps.length).to.equal(0);
			});
		});

		describe("getNextApplicationId", () => {
			it("Should return the next application Id", async () => {
				expect(await contract.read.getNextApplicationId()).to.equal(
					parseUnits("0", 0),
				);

				const app = {
					name: "app",
					account: generateRandomAddress(),
				};

				await contract.write.createApplication([app]);
				expect(await contract.read.getNextApplicationId()).to.equal(
					parseUnits("1", 0),
				);
			});
		});
	});
});
