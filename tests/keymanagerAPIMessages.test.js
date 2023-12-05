/* eslint-disable no-undef */
const MockAdapter = require("axios-mock-adapter");
const {buildKeyManagerApiUrl, createKeymanagerRequestBody, requestValidatorSignature, keymanagerAPIMessages } = require("../src/withdrawal/keymanagerAPIMessages.js");
const {getStateRoot, getForkInfo, getGenesisValidatorsRoot } = require("../src/withdrawal/beaconNodeEndpoint.js");
const axiosInstance = require("../src/utils/axiosInstance.js");

const mock = new MockAdapter(axiosInstance);

describe("buildKeyManagerApiUrl", () => {
	test("should return the correct remote signer URL", () => {
		const keymanagerUrl = "https://example.com";

		const validatorKey = "0x123456789abcdef";
        const epoch = 3000

		const expectedResult = "https://example.com/eth/v1/validator/0x123456789abcdef/voluntary_exit?epoch=3000";
		const result = buildKeyManagerApiUrl(keymanagerUrl, validatorKey, epoch);

		expect(result).toEqual(expectedResult);
	});
});

describe("createKeymanagerRequestBody", () => {
	test("should return the correct remote signer request body", () => {
		const epoch = 12345;

		const validatorIndex = 98765;
		const fork = {
			previous_version: "0x01020304",
			current_version: "0x05060708",
			epoch: "18446744073709551616",
		};
		const genesis_validators_root = "0x123456789abcdef";

		const expectedResult = {
			type: "VOLUNTARY_EXIT",
			fork_info: {
				fork: {
					previous_version: "0x01020304",
					current_version: "0x05060708",
					epoch: "18446744073709551616",
				},
				genesis_validators_root: "0x123456789abcdef",
			},
			voluntary_exit: {
				epoch: "12345",
				validator_index: "98765",
			},
		};
		const result = createKeymanagerRequestBody(epoch, validatorIndex, fork, genesis_validators_root);

		expect(result).toEqual(expectedResult);
	});
});

describe("requestValidatorSignature", () => {

	test("should return the correct response from remote signer", async () => {
		const keymanagerUrl = "http://localhost:3001";

		const validatorKey = "0x123456789abcdef";
		const epoch = 12345;
		const validatorIndex = 98765;
		const fork = {
			previous_version: "0x01020304",
			current_version: "0x05060708",
			epoch: "18446744073709551616",
		};
		const genesis_validators_root = "0x123456789abcdef";

		const url = buildKeyManagerApiUrl(keymanagerUrl, validatorKey, epoch);
		const body = createKeymanagerRequestBody(epoch, validatorIndex, fork, genesis_validators_root);

		const mockResponse = {
			data: {
				signature: "0x987654321fedcba12987654321fedcba12987654321fedcba12987654321fedcba12987654321fedcba1254354321fedcba154321fedcba54321fedcba154321fedcba154321fedcba1154321fedcba154321fedcba154321fedcba121fedcba",
			}
		};

		mock.onPost(url, body).reply(200, mockResponse);

		const response = await requestValidatorSignature(url, body);

		expect(response.status).toEqual(200);
		expect(response.data).toEqual(mockResponse);
	});

	test("should not thrown an expection when a 404 http response is received from remote signer", async () => {
		const keymanagerUrl = "http://localhost:3001";

		const validatorKey = "0x123456789abcdef";
		const epoch = 12345;
		const validatorIndex = 98765;
		const fork = {
			previous_version: "0x01020304",
			current_version: "0x05060708",
			epoch: "1",
		};
		const genesis_validators_root = "0x123456789abcdef";

		const url = buildKeyManagerApiUrl(keymanagerUrl, validatorKey, epoch);
		const body = createKeymanagerRequestBody(epoch, validatorIndex, fork, genesis_validators_root);

		const mockResponse = "Not Found";

		mock.onPost(url, body).reply(404, mockResponse);

		const response = await requestValidatorSignature(url, body);

		// Expect no exception to be thrown
		expect(response.status).toEqual(404);

	});

	test("should throw an error if the signature length is invalid", async () => {
		const keymanagerUrl = "http://localhost:3001";

		const validatorKey = "0x123456789abcdef";
		const epoch = 12345;
		const validatorIndex = 98765;
		const fork = {
			previous_version: "0x01020304",
			current_version: "0x05060708",
			epoch: "18446744073709551616",
		};
		const genesis_validators_root = "0x123456789abcdef";

		const url = buildKeyManagerApiUrl(keymanagerUrl, validatorKey, epoch);
		const body = createKeymanagerRequestBody(epoch, validatorIndex, fork, genesis_validators_root);

		const mockResponse = {
			data: {
				signature: "0x987654321fedcba", // This signature has an invalid length
			}
		};

		mock.onPost(url, body).reply(200, mockResponse);

		await expect(requestValidatorSignature(url, body, validatorIndex)).rejects.toThrow(/not returning a valid signature/);

	});

});

describe("keymanagerAPIMessages", () => {

	afterEach(() => {
		mock.reset();
	});

	test("Should sign all withdrawal messages successfully", async () => {

		const validators = [
			{ validatorIndex: 1, key: "key1" },
			{ validatorIndex: 2, key: "key2" },
		];

		const epoch = 1;
		const keymanagerUrl = "http://localhost:3001";
		const beaconNodeEndpoint = "http://localhost:5052";

		const stateRoot = "0x88f68b30714e78da09bae0065a11167dc4c8b3ef9203c30ae973fb1eb14a38b6";
		const fork = { current_version: "0x03001020" };
		const genesis_validators_root = "0x043db0d9a83813551ee2f33450d23797757d430911a9320530ad8a0eabc43efb";
		const signature1 = "0x187654321fedcba12987654321fedcba12987654321fedcba12987654321fedcba12987654321fedcba1254354321fedcba154321fedcba54321fedcba154321fedcba154321fedcba1154321fedcba154321fedcba154321fedcba121fedcba";
		const signature2 = "0x287654321fedcba12987654321fedcba12987654321fedcba12987654321fedcba12987654321fedcba1254354321fedcba154321fedcba54321fedcba154321fedcba154321fedcba1154321fedcba154321fedcba154321fedcba121fedcba";

		const headerResponse = {
			data: [
				{
					header: {
						message: {
							state_root: stateRoot,
						},
					},
				},
			],
		};

		mock.onGet(`${beaconNodeEndpoint}/eth/v1/beacon/headers`).reply(200, headerResponse);
		mock.onGet(`${beaconNodeEndpoint}/eth/v1/beacon/states/${stateRoot}/fork`).reply(200, { data: fork });
		mock.onGet(`${beaconNodeEndpoint}/eth/v1/beacon/genesis`).reply(200, { data: { genesis_validators_root } });

		mock.onPost(`${keymanagerUrl}/eth/v1/validator/key1/voluntary_exit?epoch=${epoch}`).reply(200, { data:{signature: signature1 }});
		mock.onPost(`${keymanagerUrl}/eth/v1/validator/key2/voluntary_exit?epoch=${epoch}`).reply(200, { data:{signature: signature2 }});

		const result = await keymanagerAPIMessages(validators, epoch, keymanagerUrl, beaconNodeEndpoint);

		expect(result).toEqual([
		{
			epoch: epoch,
			validator_index: 1,
			signature: signature1,
		},
		{
			epoch: epoch,
			validator_index: 2,
			signature: signature2,
		},
		]);

	});

	test("Should handle 404 not found from remote signer", async () => {
		const validators = [
			{ validatorIndex: 1, key: "key1" },
			{ validatorIndex: 2, key: "key2" },
		];

		const epoch = 1;
		const keymanagerUrl = "http://localhost:3001";
		const beaconNodeEndpoint = "http://localhost:5052";

		const stateRoot = "0x88f68b30714e78da09bae0065a11167dc4c8b3ef9203c30ae973fb1eb14a38b6";
		const fork = { current_version: "0x03001020" };
		const genesis_validators_root = "0x043db0d9a83813551ee2f33450d23797757d430911a9320530ad8a0eabc43efb";
		const signature1 = "0x187654321fedcba12987654321fedcba12987654321fedcba12987654321fedcba12987654321fedcba1254354321fedcba154321fedcba54321fedcba154321fedcba154321fedcba1154321fedcba154321fedcba154321fedcba121fedcba";

		const headerResponse = {
			data: [
				{
					header: {
						message: {
							state_root: stateRoot,
						},
					},
				},
			],
		};

		mock.onGet(`${beaconNodeEndpoint}/eth/v1/beacon/headers`).reply(200, headerResponse);
		mock.onGet(`${beaconNodeEndpoint}/eth/v1/beacon/states/${stateRoot}/fork`).reply(200, { data: fork });
		mock.onGet(`${beaconNodeEndpoint}/eth/v1/beacon/genesis`).reply(200, { data: { genesis_validators_root } });

		mock.onPost(`${keymanagerUrl}/eth/v1/validator/key1/voluntary_exit?epoch=${epoch}`).reply(200, { data:{signature: signature1 }});
		mock.onPost(`${keymanagerUrl}/eth/v1/validator/key2/voluntary_exit?epoch=${epoch}`).reply(404);

		const result = await keymanagerAPIMessages(validators, epoch, keymanagerUrl, beaconNodeEndpoint);

		expect(result).toEqual([
		{
			epoch: epoch,
			validator_index: 1,
			signature: signature1,
		},
		]);
	});

});
