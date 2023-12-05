const fs = require('fs');

const inquirer = require("inquirer");
const { percentageValidation, passwordValidation, outputFolderValidation, operatorIdValidation, urlValidation, moduleIdValidation, urlsValidation, keymanagerTokenFolderValidation, overwriteValidation } = require("./src/utils/validations");
const { fetchValidatorsData } = require("./src/withdrawal/fetchValidatorsData");
const { encryptMessages } = require("./src/withdrawal/encryptMessages");

const { keymanagerAPIMessages } = require("./src/withdrawal/keymanagerAPIMessages");
const { signWithdrawalMessages } = require("./src/withdrawal/signWithdrawalMessages");

// Load environment variables from the .env file
require("dotenv").config();

async function main() {

	console.log("\n");
	console.info("🚀 Lido Withdrawals Automation developed by Stakely.io - 2023 v1.0.1");
	console.log("\n");
	console.info("Step 1: Checking environment variables and asking for missing values...");

	// Get values from environment variables or undefined if not present
	const env = {
		percentage: process.env.PERCENTAGE,
		kapiUrl: process.env.KAPI_URL,
		remoteSignerUrl: process.env.REMOTE_SIGNER_URL,
		keymanagerUrls: process.env.KEYMANAGER_URLS,
		password: process.env.PASSWORD,
		outputFolder: process.env.OUTPUT_FOLDER,
		operatorId: process.env.OPERATOR_ID,
		beaconNodeUrl: process.env.BEACON_NODE_URL,
		moduleId: process.env.MODULE_ID,
		keymanagerTokenFile: process.env.KEYMANAGER_TOKEN_FILE,
		alwaysOverwrite: process.env.ALWAYS_OVERWRITE,
	};

	// Validate environment variables
	for (const [key, value] of Object.entries(env)) {
		const validationFunction = {
			percentage: percentageValidation,
			kapiUrl: urlValidation,
			remoteSignerUrl: urlsValidation,
			keymanagerUrls: urlsValidation,
			password: passwordValidation,
			outputFolder: outputFolderValidation,
			operatorId: operatorIdValidation,
			beaconNodeUrl: urlValidation,
			moduleId: moduleIdValidation,
			keymanagerTokenFile: keymanagerTokenFolderValidation,
		}[key];

		const validationResult = validationFunction(value);
		if (value && validationResult !== true) {
			console.error(`Error in environment variable ${key}: ${validationResult}`);
			process.exit(1);
		}
	}

	// Ask for missing values
	const questions = [];

	if (!env.percentage) {
		questions.push({
			type: "input",
			name: "percentage",
			message: "Please enter the percentage of validators (1 to 100):",
			validate: percentageValidation,
		});
	}

	if (!env.kapiUrl) {
		questions.push({
			type: "input",
			name: "kapiUrl",
			message: "Please enter the Kapi endpoint URL:",
			validate: urlValidation,
		});
	}

	if (!env.remoteSignerUrl && !env.keymanagerUrls)  {
		const readline = require('readline-sync');
		const useRemoteSignerUrl = readline.question('Do you want to use remote signer URLs? (yes, no): ')
		if (useRemoteSignerUrl === 'yes' || useRemoteSignerUrl === 'y') {
			questions.push({
				type: "input",
				name: "remoteSignerUrl",
				message: "Please enter the remote signer URL:",
				validate: urlsValidation,
			});
		}
	}

	if (!env.keymanagerUrls && !env.remoteSignerUrl)  {
		const readline = require('readline-sync');
		const useKeymanagerAPI = readline.question('Do you want to use KeymanagerAPI URLs? (yes, no): ')
		if (useKeymanagerAPI === 'yes' || useKeymanagerAPI === 'y') {
			questions.push({
				type: "input",
				name: "keymanagerUrls",
				message: "Please enter the Key Manager Urls:",
				validate: urlsValidation,
			});
		};
	}

	if (!env.password) {
		questions.push({
			type: "input",
			name: "password",
			message: "Please enter a password to encrypt the withdrawal messages:",
			validate: passwordValidation,
		});
	}

	if (!env.outputFolder) {
		questions.push({
			type: "input",
			name: "outputFolder",
			message: "Please enter the path to the output folder:",
			validate: outputFolderValidation,
		});
	}

	if (!env.operatorId) {
		questions.push({
			type: "input",
			name: "operatorId",
			message: "Please enter the operator ID:",
			validate: operatorIdValidation,
		});
	}

	if (!env.beaconNodeUrl) {
		questions.push({
			type: "input",
			name: "beaconNodeUrl",
			message: "Please enter the beacon node URL:",
			validate: urlValidation,
		});
	}

	if (!env.moduleId) {
		questions.push({
			type: "input",
			name: "moduleId",
			message: "Please enter the module ID:",
			validate: moduleIdValidation,
		});
	}

	const answers = await inquirer.prompt(questions);

	// Combine environment variables and answers
	const params = {
		percentage: env.percentage || answers.percentage,
		kapiUrl: env.kapiUrl || answers.kapiUrl,
		remoteSignerUrl: env.remoteSignerUrl || answers.remoteSignerUrl,
		keymanagerUrls: env.keymanagerUrls || answers.keymanagerUrls,
		password: env.password || answers.password,
		operatorId: env.operatorId || answers.operatorId,
		outputFolder: env.outputFolder || answers.outputFolder,
		beaconNodeUrl: env.beaconNodeUrl || answers.beaconNodeUrl,
		moduleId: env.moduleId || answers.moduleId,
		keymanagerTokenFile: env.keymanagerTokenFile,
		overwrite: env.overwrite,
	};

	// Get validators data from Kapi
	console.log("Step 2: Fetching validators data from Kapi...");

	const kapiJsonResponse = await fetchValidatorsData(
		params.kapiUrl, // Kapi URL
		params.moduleId, // Module ID
		params.operatorId, // Operator ID
		params.percentage // Percentage of validators
	);

	let signatures = [];
	console.log("Step 3: Creating the withdrawal messages and signing them with the remote signer...");

	if(params.keymanagerUrls) {
		const keymanagerUrls = params.keymanagerUrls.split(",").map(s => s.trim());
		for (let i = 0; i < keymanagerUrls.length; i++) {
			const keymanagerUrl = keymanagerUrls[i];
			const token = fs.readFileSync(params.keymanagerTokenFile, 'utf-8').trim();
			console.log(`KeymanagerAPI URL: ${keymanagerUrl}`);
			signatures = signatures.concat(await keymanagerAPIMessages(
				kapiJsonResponse.data, // Validators data (public keys)
				kapiJsonResponse.meta.clBlockSnapshot.epoch, // Epoch from Kapi
				keymanagerUrl, // Remote signer URL
				params.beaconNodeUrl, // Beacon node URL
				token, // Keymanager token
			));
		};
	}

	if(params.remoteSignerUrl) {
		const remoteSignerUrls = params.remoteSignerUrl.split(",").map(s => s.trim());
		for (let i = 0; i < remoteSignerUrls.length; i++) {
			const remoteSignerUrl = remoteSignerUrls[i];
			console.log(`Signer URL: ${remoteSignerUrl}`);
			signatures = signatures.concat(await signWithdrawalMessages(
				kapiJsonResponse.data, // Validators data (public keys)
				kapiJsonResponse.meta.clBlockSnapshot.epoch, // Epoch from Kapi
				remoteSignerUrl, // Remote signer URL
				params.beaconNodeUrl, // Beacon node URL
			));
		};
	}

	console.log("\n");
	console.log("Step 4: Encrypt the signed messages with the password file and save them to the output folder...");

	await encryptMessages(
		signatures, // Signed messages
		params.outputFolder, // Output folder
		params.password, // File with the password
		params.overwrite,
	);

	console.log("\n");

}

main();

// Cath all unhanded exceptions
process.on("unhandledRejection", (error) => {
	console.error(error.message);
	process.exit(1);
});
