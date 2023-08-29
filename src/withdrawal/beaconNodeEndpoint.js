const axiosInstance = require("../utils/axiosInstance.js");

async function getStateRoot(beaconNodeEndpoint) {
	try {
		const response = await axiosInstance.get(beaconNodeEndpoint + "/eth/v1/beacon/headers", {
			headers: {
				"Content-Type": "application/json"
			},
		});

		const stateRoot = response.data.data[0].header.message.state_root;

		if (!stateRoot) {
			throw new Error("State root is empty or undefined.");
		}

		return stateRoot;
	} catch (error) {
		throw new Error("Failed to fetch state root from the Beacon Node. " + error.message);
	}
}

async function getForkInfo(beaconNodeEndpoint, stateRoot) {
	try {
		const response = await axiosInstance.get(beaconNodeEndpoint + "/eth/v1/beacon/states/" + stateRoot + "/fork", {
			headers: {
				"Content-Type": "application/json"
			},
		});

		const fork = response.data.data;
		if (!fork) {
			throw new Error("Fork is empty or undefined.");
		}

		return fork;
	} catch (error) {
		throw new Error("Failed to fetch fork info from the Beacon Node. " + error.message);
	}
}

async function getGenesisValidatorsRoot(beaconNodeEndpoint) {
	try {
		const response = await axiosInstance.get(beaconNodeEndpoint + "/eth/v1/beacon/genesis", {
			headers: {
				"Content-Type": "application/json"
			},
		});

		if(!response.data.data) {
			throw new Error("Response data is empty or undefined.");
		}

		const genesis_validators_root = response.data.data.genesis_validators_root;

		if (!genesis_validators_root) {
			throw new Error("Genesis validator root is empty or undefined.");
		}

		return genesis_validators_root;
	} catch (error) {
		throw new Error("Failed to fetch genesis validator root from the Beacon Node. " + error.message);
	}
}

module.exports = {
	getStateRoot,
	getForkInfo,
	getGenesisValidatorsRoot,
};
