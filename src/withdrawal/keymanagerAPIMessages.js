const axiosInstance = require("../utils/axiosInstance.js");
const {getStateRoot, getForkInfo, getGenesisValidatorsRoot } = require("./beaconNodeEndpoint.js");

function buildKeyManagerApiUrl(keymanagerUrl, validatorKey, epoch) {
	return `${keymanagerUrl}/eth/v1/validator/${validatorKey}/voluntary_exit?epoch=${epoch}`;
}

function createKeymanagerRequestBody(epoch, validatorIndex, fork, genesis_validators_root) {
	return {
		type: "VOLUNTARY_EXIT",
		fork_info: {
			fork,
			genesis_validators_root,
		},
		voluntary_exit: {
			epoch: String(epoch),
			validator_index: String(validatorIndex),
		},
	};

}

async function requestValidatorSignature(keymanagerUrl, body, token) {


	const response = await axiosInstance.post(keymanagerUrl, body, {
		headers: {
			"Accept": "application/json",
			"Content-Type": "application/json",
			"Authorization": "Bearer " + token,
		},
		validateStatus: (status) => {
			return (status === 200 || status === 404);
		},
	});

	// 404 means that the key is not found in the keymanager
	if(response.status === 404){
		return response;
	}

	if(!response.data.data || !response.data.data.signature || response.data.data.signature.length !== 194){
		console.log (response);
		throw new Error("Keymanager is not returning a valid signature. Url: " + keymanagerUrl);
	}

	return response;
}

async function keymanagerAPIMessages(validators, epoch, keymanagerUrl, beaconNodeEndpoint, token) {

	const stateRoot = await getStateRoot(beaconNodeEndpoint);
	console.log("State root: " + stateRoot);

	const fork = await getForkInfo(beaconNodeEndpoint, stateRoot);

	const genesis_validators_root = await getGenesisValidatorsRoot(beaconNodeEndpoint);

	console.log("Genesis validator root: " + genesis_validators_root);

	console.log("\n");
	console.log("================= [ REQUESTING SIGNATURES ] =================");

	let i = 0;
	let okSignatures = 0;
	const signatures = [];

	for (const validator of validators) {
		i++;
		console.log("Requesting signature " + i + "/" + validators.length + " (Validator #" + validator.validatorIndex + ")");

		let completeKeymanagerUrl;
		const body = createKeymanagerRequestBody(epoch, validator.validatorIndex, fork, genesis_validators_root);
		completeKeymanagerUrl = buildKeyManagerApiUrl(keymanagerUrl, validator.key, epoch);

		try {
			const remoteKeymanager = await requestValidatorSignature(completeKeymanagerUrl, body, token);

			if (remoteKeymanager.status === 404) {
				console.log("Key not found in keymanager. " +  "(Validator #" + validator.validatorIndex + ")" + " Skipping...");
				continue;
			}

			if (remoteKeymanager.status !== 200) {
				throw new Error("Keymanager returned status code " + remoteKeymanager.status);
			}

			const signature = remoteKeymanager.data.data.signature;
			okSignatures++;

			console.log("Signature of validator #" + validator.validatorIndex + " generated successfully.");

			signatures.push({
				validator_index: validator.validatorIndex,
				signature: signature,
				epoch: epoch,
			});

		} catch (error) {
			throw new Error(
				"Failed to fetch data from the keymanager (Url: " + keymanagerUrl + "). " + error.message +
				"\n Complete URL: " + completeKeymanagerUrl +
				"\n Body: " + JSON.stringify(body)
			);
		}
	}

	console.log("\n");
	console.log("================= [SIGNATURES REPORT] =================");
	console.log("Requested signatures: " + i + "/" + validators.length);
	console.log("Successful signatures: " + okSignatures + "/" + validators.length);
	console.log("Failed signatures: " + (i - okSignatures));

	return signatures;
}

module.exports = {
	buildKeyManagerApiUrl,
	createKeymanagerRequestBody,
	requestValidatorSignature,
	keymanagerAPIMessages
};
