import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { type Address, getAddress, parseUnits } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

interface Application {
	name: string;
	account: Address;
}

describe("ApplicationManager", () => {
	// We define a fixture to reuse the same setup in every test.
	// We use loadFixture to run this setup once, snapshot that state,
	// and reset Hardhat Network to that snapshot in every test.
	async function deploy() {
		// Contracts are deployed using the first signer/account by default
		const [owner, otherAccount, app1Account] =
			await hre.viem.getWalletClients();

		const contract = await hre.viem.deployContract("ApplicationManager");

		const publicClient = await hre.viem.getPublicClient();

		return {
			contract,
			owner,
			otherAccount,
			app1Account,
			publicClient,
		};
	}

	function generateRandomAddress(): string {
		const randomKey = generatePrivateKey();
		const account = privateKeyToAccount(randomKey);
		return account.address;
	}

	describe("Deployment", () => {
		it("Should set the nextxApplicationId to 0", async () => {
			const { contract } = await loadFixture(deploy);
			expect(await contract.read.getNextApplicationId()).to.equal(
				parseUnits("0", 0),
			);
		});
	});

	describe("createApplication", () => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		let contract: any;
		let app: Application;
		const account = generateRandomAddress() as Address;
		beforeEach(async () => {
			const fixture = await loadFixture(deploy);
			contract = fixture.contract;
			app = {
				name: "app",
				account,
			};
		});

		it("Should accept Application as input", async () => {
			expect(await contract.write.createApplication([app])).to.be.string;
		});
		it("Should increment nextApplicationId", async () => {
			const applicationId0 = await contract.read.getNextApplicationId();
			expect(applicationId0).to.equal(parseUnits("0", 0));
			await contract.write.createApplication([app]);
			const applicationId1 = await contract.read.getNextApplicationId();
			expect(applicationId1).to.equal(parseUnits("1", 0));
		});
		it("Should create a new Application", async () => {
			const applicationId = await contract.read.getNextApplicationId();
			await contract.write.createApplication([app]);
			expect(await contract.read.getApplication([applicationId])).to.contain(
				app,
			);
		});
		it("Should revert if the account address is already used", async () => {
			await contract.write.createApplication([app]);
			await expect(contract.write.createApplication([app])).to.be.rejectedWith(
				"Address already used for another application",
			);
		});
		it("Should emit the ApplicationCreated event with the new application's details", async () => {
			const applicationId = await contract.read.getNextApplicationId();
			const txHash = await contract.write.createApplication([app]);

			const events = await contract.getEvents.ApplicationCreated();

			expect(events.length).to.be.equal(1);

			const event = events[0];
			expect(event.eventName).to.be.equal("ApplicationCreated");
			expect(event.transactionHash).to.be.equal(txHash);
			expect(event.args.id).to.be.equal(applicationId);
			expect(event.args.application).to.contain(app);
		});
	});

	describe("updateApplication", () => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		let contract: any;
		let app: Application;
		const account = generateRandomAddress() as Address;

		beforeEach(async () => {
			const fixture = await loadFixture(deploy);
			contract = fixture.contract;

			app = {
				name: "app",
				account,
			};

			await contract.write.createApplication([app]);
		});

		it("Should accept Application and id as inputs", async () => {
			const applicationId = await contract.read.getNextApplicationId()- parseUnits("1", 0);
			expect(await contract.write.updateApplication([applicationId, app])).to.be
				.string;
		});
		it("Should update the application in the applications mapping with the provided applicationId to have the application data", async () => {
			const applicationId = await contract.read.getNextApplicationId()- parseUnits("1", 0);
			await contract.write.updateApplication([
				applicationId,
				{ account: app.account, name: "new app name" },
			]);
			expect(await contract.read.getApplication([applicationId])).to.contain({
				account: app.account,
				name: "new app name",
			});
		});
		it("Should revert if the account address is already used", async () => {
			const applicationId1 = await contract.read.getNextApplicationId();
			expect(applicationId1).to.equal(parseUnits("1", 0));
			await contract.write.createApplication([
				{
					account: generateRandomAddress() as Address,
					name: "new app",
				},
			]);

			await expect(
				contract.write.updateApplication([applicationId1, app]),
			).to.be.rejectedWith("Address already used for another application");
		});
		it("Should revert if the application does not exist", async () => {
			const nonExistentId = parseUnits("999", 0);
			await expect(
				contract.write.updateApplication([nonExistentId, app]),
			).to.be.rejectedWith("Application does not exist");
		});

		it("Should emit the ApplicationUpdated event with the updated application's details", async () => {
			const applicationId = await contract.read.getNextApplicationId()- parseUnits("1", 0);
			const txHash = await contract.write.updateApplication([
				applicationId,
				app,
			]);
			const events = await contract.getEvents.ApplicationUpdated();
			expect(events.length).to.be.equal(1);

			const event = events[0];
			expect(event.eventName).to.be.equal("ApplicationUpdated");
			expect(event.transactionHash).to.be.equal(txHash);
			expect(event.args.id).to.be.equal(applicationId);
			expect(event.args.application).to.contain(app);
		});
	});

	describe("deleteApplication", () => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		let contract: any;
		let app: Application;
		const account = privateKeyToAccount(generatePrivateKey()).address;

		beforeEach(async () => {
			const fixture = await loadFixture(deploy);
			contract = fixture.contract;

			app = {
				name: "app",
				account,
			};

			await contract.write.createApplication([app]);
		});

		it("Should accept id as input", async () => {
			const applicationId = await contract.read.getNextApplicationId()- parseUnits("1", 0);
			expect(await contract.write.deleteApplication([applicationId])).to.be
				.string;
		});
		it("Should delete the application from the applications mapping with the provided applicationId", async () => {
			const applicationId = await contract.read.getNextApplicationId()- parseUnits("1", 0);
			await contract.write.deleteApplication([applicationId]);
			await expect(
				contract.read.getApplication([applicationId]),
			).to.be.rejectedWith("Application does not exist");
		});
		it("Should revert if the application does not exist", async () => {
			const nonExistentId = parseUnits("999", 0);
			await expect(
				contract.write.deleteApplication([nonExistentId]),
			).to.be.rejectedWith("Application does not exist");
		});

		it("Should emit the ApplicationDeleted event with the deleted application's details", async () => {
			const applicationId = await contract.read.getNextApplicationId()- parseUnits("1", 0);
			const txHash = await contract.write.deleteApplication([applicationId]);

			const events = await contract.getEvents.ApplicationDeleted();
			expect(events.length).to.be.equal(1);

			const event = events[0];
			expect(event.eventName).to.be.equal("ApplicationDeleted");
			expect(event.transactionHash).to.be.equal(txHash);
			expect(event.args.id).to.be.equal(applicationId);
			expect(event.args.application).to.contain(app);
		});
	});

	describe("getApplication", () => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		let contract: any;
		let app: Application;
		const account = privateKeyToAccount(generatePrivateKey()).address;

		beforeEach(async () => {
			const fixture = await loadFixture(deploy);
			contract = fixture.contract;

			app = {
				name: "app",
				account,
			};

			await contract.write.createApplication([app]);
		});

		it("Should accept id as input", async () => {
			const applicationId = await contract.read.getNextApplicationId()- parseUnits("1", 0);
			expect(await contract.write.getApplication([applicationId])).to.be.string;
		});
		it("Should return the application from the applications mapping with the provided applicationId", async () => {
			const applicationId = await contract.read.getNextApplicationId()- parseUnits("1", 0);
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
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		let contract: any;
		let apps: Application[];
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		let fixture: any;

		beforeEach(async () => {
			fixture = await loadFixture(deploy);
			contract = fixture.contract;
			apps = [];
			for (let i = 0; i < 8; i++) {
				const app = {
					name: `app${i}`,
					account: generateRandomAddress() as Address,
				};
				await contract.write.createApplication([app]);
				apps.push(app);
			}
		});

		it("Should accept start and limit as inputs", async () => {
			const start = parseUnits("0", 0);
			const limit = parseUnits("7", 0);

			expect(await contract.write.getApplications([start, limit])).to.be.string;
		});

		it("Should return an array of Application structs starting from the start index and containing up to limit entries.", async () => {
			const start = parseUnits("0", 0);
			const limit = parseUnits("6", 0);
			const returnedApps = await contract.read.getApplications([start, limit]);
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
			const returnedApps = await contract.read.getApplications([start, limit]);
			expect(returnedApps.length).to.equal(1);
			expect(returnedApps).to.deep.include.members([apps[6]]);
		});

		it("Should return no applications if all within range are deleted", async () => {
			await contract.write.deleteApplication([parseUnits("0", 0)]);
			await contract.write.deleteApplication([parseUnits("2", 0)]);
			await contract.write.deleteApplication([parseUnits("1", 0)]);
			await contract.write.deleteApplication([parseUnits("3", 0)]);
			await contract.write.deleteApplication([parseUnits("4", 0)]);
			await contract.write.deleteApplication([parseUnits("5", 0)]);
			await contract.write.deleteApplication([parseUnits("6", 0)]);
			await contract.write.deleteApplication([parseUnits("7", 0)]);
			const start = parseUnits("0", 0);
			const limit = parseUnits("7", 0);
			const returnedApps = await contract.read.getApplications([start, limit]);
			expect(returnedApps.length).to.equal(0);
		});
	});

	describe("getNextApplicationId", () => {
        let contract: any;

        beforeEach(async () => {
            const fixture = await loadFixture(deploy);
            contract = fixture.contract;
        });

        it("Should return the next application ID", async () => {
            expect(await contract.read.getNextApplicationId()).to.equal(parseUnits("0", 0));

            const app = {
                name: "app",
                account: generateRandomAddress() as Address,
            };
            await contract.write.createApplication([app]);
            expect(await contract.read.getNextApplicationId()).to.equal(parseUnits("1", 0));
        });
    });
});
