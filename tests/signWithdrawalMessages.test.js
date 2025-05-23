/* eslint-disable no-undef */
const MockAdapter = require("axios-mock-adapter");
const {buildRemoteSignerUrl, createRemoteSignerRequestBody, requestValidatorSignature, signWithdrawalMessages } = require("../src/withdrawal/signWithdrawalMessages.js");
const {getStateRoot, getForkInfo, getGenesisValidatorsRoot } = require("../src/withdrawal/beaconNodeEndpoint.js");
const axiosInstance = require("../src/utils/axiosInstance.js");

const mock = new MockAdapter(axiosInstance);

describe("buildRemoteSignerUrl", () => {
	test("should return the correct remote signer URL", () => {
		const remoteSignerUrl = "https://example.com";
		const validatorKey = "0x123456789abcdef";
        
		const expectedResult = "https://example.com/api/v1/eth2/sign/0x123456789abcdef";
		const result = buildRemoteSignerUrl(remoteSignerUrl, validatorKey);
        
		expect(result).toEqual(expectedResult);
	});
});

describe("createRemoteSignerRequestBody", () => {
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
		const result = createRemoteSignerRequestBody(epoch, validatorIndex, fork, genesis_validators_root);
        
		expect(result).toEqual(expectedResult);
	});
});

describe("requestValidatorSignature", () => {
    
	test("should return the correct response from remote signer", async () => {
		const remoteSignerUrl = "http://localhost:3001";
		const validatorKey = "0x123456789abcdef";
		const epoch = 12345;
		const validatorIndex = 98765;
		const fork = {
			previous_version: "0x01020304",
			current_version: "0x05060708",
			epoch: "18446744073709551616",
		};
		const genesis_validators_root = "0x123456789abcdef";
        
		const url = buildRemoteSignerUrl(remoteSignerUrl, validatorKey);
		const body = createRemoteSignerRequestBody(epoch, validatorIndex, fork, genesis_validators_root);
        
		const mockResponse = {
			signature: "0x987654321fedcba12987654321fedcba12987654321fedcba12987654321fedcba12987654321fedcba1254354321fedcba154321fedcba54321fedcba154321fedcba154321fedcba1154321fedcba154321fedcba154321fedcba121fedcba",
		};
        
		mock.onPost(url, body).reply(200, mockResponse);
        
		const response = await requestValidatorSignature(url, body);
        
		expect(response.status).toEqual(200);
		expect(response.data).toEqual(mockResponse);
	});
    
	test("should not thrown an expection when a 404 http response is received from remote signer", async () => {
		const remoteSignerUrl = "http://localhost:3001";
		const validatorKey = "0x123456789abcdef";
		const epoch = 12345;
		const validatorIndex = 98765;
		const fork = {
			previous_version: "0x01020304",
			current_version: "0x05060708",
			epoch: "1",
		};
		const genesis_validators_root = "0x123456789abcdef";
        
		const url = buildRemoteSignerUrl(remoteSignerUrl, validatorKey);
		const body = createRemoteSignerRequestBody(epoch, validatorIndex, fork, genesis_validators_root);
        
		const mockResponse = "Not Found";
        
		mock.onPost(url, body).reply(404, mockResponse);
        
		const response = await requestValidatorSignature(url, body);
        
		// Expect no exception to be thrown
		expect(response.status).toEqual(404);
        
	});
    
	test("should throw an error if the signature length is invalid", async () => {
		const remoteSignerUrl = "http://localhost:3001";
		const validatorKey = "0x123456789abcdef";
		const epoch = 12345;
		const validatorIndex = 98765;
		const fork = {
			previous_version: "0x01020304",
			current_version: "0x05060708",
			epoch: "18446744073709551616",
		};
		const genesis_validators_root = "0x123456789abcdef";
        
		const url = buildRemoteSignerUrl(remoteSignerUrl, validatorKey);
		const body = createRemoteSignerRequestBody(epoch, validatorIndex, fork, genesis_validators_root);
        
		const mockResponse = {
			signature: "0x987654321fedcba", // This signature has an invalid length
		};
        
		mock.onPost(url, body).reply(200, mockResponse);
        
		await expect(requestValidatorSignature(url, body, validatorIndex)).rejects.toThrow(/not returning a valid signature/);
        
	});
    
});

describe("signWithdrawalMessages", () => {
    
	afterEach(() => {
		mock.reset();
	});
    
	test("Should sign all withdrawal messages successfully", async () => {
        
		const validators = [
			{ validatorIndex: 1, key: "key1" },
			{ validatorIndex: 2, key: "key2" },
		];
        
		const epoch = 1;
		const remoteSignerUrl = "http://localhost:3001";
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
        
		mock.onPost(`${remoteSignerUrl}/api/v1/eth2/sign/key1`).reply(200, { signature: signature1 });
		mock.onPost(`${remoteSignerUrl}/api/v1/eth2/sign/key2`).reply(200, { signature: signature2 });
        
		const result = await signWithdrawalMessages(validators, epoch, remoteSignerUrl, beaconNodeEndpoint);
        
		expect(result).toEqual([
			{
				validator_index: 1,
				validator_key: "key1",
				signature: signature1,
				fork_version: fork.current_version,
				epoch: epoch,
			},
			{
				validator_index: 2,
				validator_key: "key2",
				signature: signature2,
				fork_version: fork.current_version,
				epoch: epoch,
			},
		]);
        
	});
    
	test("Should handle 404 not found from remote signer", async () => {
		const validators = [
			{ validatorIndex: 1, key: "key1" },
			{ validatorIndex: 2, key: "key2" },
		];
        
		const epoch = 1;
		const remoteSignerUrl = "http://localhost:3001";
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
        
		mock.onPost(`${remoteSignerUrl}/api/v1/eth2/sign/key1`).reply(200, { signature: signature1 });
		mock.onPost(`${remoteSignerUrl}/api/v1/eth2/sign/key2`).reply(404);
        
		const result = await signWithdrawalMessages(validators, epoch, remoteSignerUrl, beaconNodeEndpoint);
        
		expect(result).toEqual([
			{
				validator_index: 1,
				validator_key: "key1",
				signature: signature1,
				fork_version: fork.current_version,
				epoch: epoch,
			},
		]);
	});
    
	test("Should throw error when remote signer returns an invalid signature", async () => {
		const validators = [
			{ validatorIndex: 1, key: "key1" },
		];
        
		const epoch = 1;
		const remoteSignerUrl = "http://localhost:3001";
		const beaconNodeEndpoint = "http://localhost:5052";
        
		const stateRoot = "0x88f68b30714e78da09bae0065a11167dc4c8b3ef9203c30ae973fb1eb14a38b6";
		const fork = { current_version: "0x03001020" };
		const genesis_validators_root = "0x043db0d9a83813551ee2f33450d23797757d430911a9320530ad8a0eabc43efb";
		const invalidSignature = "0xa510342";
        
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
        
		mock.onPost(`${remoteSignerUrl}/api/v1/eth2/sign/key1`).reply(200, { signature: invalidSignature });
        
		await expect(signWithdrawalMessages(validators, epoch, remoteSignerUrl, beaconNodeEndpoint)).rejects.toThrowError("Remote signer is not returning a valid signature.");
	});
    
});
