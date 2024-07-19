import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { type Address, getAddress, parseUnits, } from "viem";
import { generatePrivateKey,privateKeyToAccount } from 'viem/accounts'
 
const privateKey = generatePrivateKey()


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
		let account= privateKeyToAccount(generatePrivateKey()).address
		beforeEach(async () => {
			const fixture = await loadFixture(deploy);
			contract = fixture.contract;
			app = {
				name: "app",
				account,
			};
		});

		it("Should accept Application as inputs", async () => {
			expect(await contract.write.createApplication([app])).to.be.string;
		});
		it("Should increment nextApplicationId", async () => {
			const t0 = await contract.read.getNextApplicationId();
			expect(t0).to.equal(parseUnits("0", 0));
			await contract.write.createApplication([app]);
			const t1 = await contract.read.getNextApplicationId();
			expect(t1).to.equal(parseUnits("1", 0));
		});
		it("Should create a new Application", async () => {
			const applicationId = await contract.read.getNextApplicationId();
			await contract.write.createApplication([app]);
			expect(await contract.read.getApplication([applicationId])).to.contain(
				app,
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
		
        it("Should revert if the account address is already used", async () => {
            await contract.write.createApplication([app]);
            await expect(contract.write.createApplication([app])).to.be.rejectedWith(
                "Address already used for another application"
            );
        });
	});

	describe("updateApplication", () => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		let contract: any;
		let app: Application;
		let applicationId: string;
		let account= privateKeyToAccount(generatePrivateKey()).address

		beforeEach(async () => {
			const fixture = await loadFixture(deploy);
			contract = fixture.contract;

			app = {
				name: "app",
				account,
			};

			applicationId = await contract.read.getNextApplicationId();
			await contract.write.createApplication([app]);
		});

		it("Should accept Application as inputs", async () => {
			expect(await contract.write.updateApplication([applicationId, app])).to.be
				.string;
		});
		it("Should update the Application struct in the applications mapping with the provided applicationId to have the application data", async () => {
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
			const t1 = await contract.read.getNextApplicationId();
			expect(t1).to.equal(parseUnits("1", 0));
			await contract.write.createApplication([{		
				account: privateKeyToAccount(generatePrivateKey()).address,
				name: "new app"
			}]);

			await expect(contract.write.updateApplication([t1, app])).to.be.rejectedWith(
                "Address already used for another application"
            );
        });
        it("Should revert if the application does not exist", async () => {
			await expect(contract.write.updateApplication(["1", app])).to.be.rejectedWith(
                "Application does not exist"
            );
        });
	});
});
