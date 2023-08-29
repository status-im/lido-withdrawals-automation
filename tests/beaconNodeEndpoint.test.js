/* eslint-disable no-undef */
const MockAdapter = require("axios-mock-adapter");
const { getStateRoot, getForkInfo, getGenesisValidatorsRoot } = require("../src/withdrawal/beaconNodeEndpoint.js");
const axiosInstance = require("../src/utils/axiosInstance.js");

const mock = new MockAdapter(axiosInstance);

describe("getStateRoot", () => {
	afterEach(() => {
		mock.reset();
	});

	test("Should return state root when the response is valid", async () => {
		const beaconNodeEndpoint = "http://localhost:5052";
		const mockedResponse = {
			data: [
				{
					header: {
						message: {
							state_root: "0x1234567890abcdef",
						},
					},
				},
			],
		};

		mock.onGet(beaconNodeEndpoint + "/eth/v1/beacon/headers").reply(200, mockedResponse);

		const result = await getStateRoot(beaconNodeEndpoint);

		expect(result).toEqual("0x1234567890abcdef");
	});

	test("Should throw an error when state root is empty or undefined", async () => {
		const beaconNodeEndpoint = "http://localhost:5052";
		const mockedResponse = {
			data: [
				{
					header: {
						message: {
							state_root: "",
						},
					},
				},
			],
		};

		mock.onGet(beaconNodeEndpoint + "/eth/v1/beacon/headers").reply(200, mockedResponse);

		await expect(async () => {
			await getStateRoot(beaconNodeEndpoint);
		}).rejects.toThrow("State root is empty or undefined.");
	});

	test("Should throw an error when fetching state root fails", async () => {
		const beaconNodeEndpoint = "http://localhost:5052";

		mock.onGet(beaconNodeEndpoint + "/eth/v1/beacon/headers").reply(500);

		await expect(async () => {
			await getStateRoot(beaconNodeEndpoint);
		}).rejects.toThrow("Failed to fetch state root from the Beacon Node.");
	});
});

describe("getForkInfo", () => {
	afterEach(() => {
		mock.reset();
	});

	test("Should return fork info when the Beacon Node response is valid", async () => {
		const beaconNodeEndpoint = "http://localhost:5052";
		const stateRoot = "0x12345";

		const mockedResponse = {
			data: {
				previous_version: "0x010203",
				current_version: "0x010204",
				epoch: "10",
			},
		};

		const forkInfoUrl = beaconNodeEndpoint + "/eth/v1/beacon/states/" + stateRoot + "/fork";

		mock.onGet(forkInfoUrl).reply(200, mockedResponse);

		const result = await getForkInfo(beaconNodeEndpoint, stateRoot);

		expect(result).toEqual(mockedResponse.data);
	});

	test("Should throw an error when the Beacon Node response is invalid", async () => {
		const beaconNodeEndpoint = "http://localhost:5052";
		const stateRoot = "0x12345";

		const mockedResponse = {
			data: null,
		};

		const forkInfoUrl = beaconNodeEndpoint + "/eth/v1/beacon/states/" + stateRoot + "/fork";

		mock.onGet(forkInfoUrl).reply(200, mockedResponse);

		await expect(async () => {
			await getForkInfo(beaconNodeEndpoint, stateRoot);
		}).rejects.toThrow("Fork is empty or undefined.");
	});

	test("Should throw an error when the Beacon Node returns an error", async () => {
		const beaconNodeEndpoint = "http://localhost:5052";
		const stateRoot = "0x12345";

		const errorMessage = "Beacon Node error";

		const forkInfoUrl = beaconNodeEndpoint + "/eth/v1/beacon/states/" + stateRoot + "/fork";

		mock.onGet(forkInfoUrl).reply(500, errorMessage);

		await expect(async () => {
			await getForkInfo(beaconNodeEndpoint, stateRoot);
		}).rejects.toThrow("Failed to fetch fork info from the Beacon Node.");
	});
});

describe("getGenesisValidatorsRoot", () => {
	afterEach(() => {
		mock.reset();
	});

	test("Should return genesis validators root when the Beacon Node response is valid", async () => {
		const beaconNodeEndpoint = "http://localhost:5052";

		const mockedResponse = {
			data: {
				genesis_validators_root: "0x010203",
			}
		};

		const genesisValidatorsRootUrl = beaconNodeEndpoint + "/eth/v1/beacon/genesis";

		mock.onGet(genesisValidatorsRootUrl).reply(200, mockedResponse);

		const result = await getGenesisValidatorsRoot(beaconNodeEndpoint);

		expect(result).toEqual(mockedResponse.data.genesis_validators_root);
	});

	test("Should throw an error when the Beacon Node response is invalid", async () => {
		const beaconNodeEndpoint = "http://localhost:5052";

		const mockedResponse = {
			data: null,
		};

		const genesisValidatorsRootUrl = beaconNodeEndpoint + "/eth/v1/beacon/genesis";

		mock.onGet(genesisValidatorsRootUrl).reply(200, mockedResponse);

		await expect(async () => {
			await getGenesisValidatorsRoot(beaconNodeEndpoint);
		}).rejects.toThrow(/is empty or undefined/);
	});

	test("Should throw an error when the Beacon Node returns an error", async () => {
		const beaconNodeEndpoint = "http://localhost:5052";

		const errorMessage = "Beacon Node error";

		const genesisValidatorsRootUrl = beaconNodeEndpoint + "/eth/v1/beacon/genesis";

		mock.onGet(genesisValidatorsRootUrl).reply(500, errorMessage);

		await expect(async () => {
			await getGenesisValidatorsRoot(beaconNodeEndpoint);
		}).rejects.toThrow(/status code 500/);
	});
});
