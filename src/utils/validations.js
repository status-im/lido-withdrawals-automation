const url = require("url");
const fs = require("fs");

function isValidUrl(inputUrl) {
	try {
		const parsedUrl = new url.URL(inputUrl);
		return ["http:", "https:"].includes(parsedUrl.protocol);
	} catch (error) {
		return false;
	}
}

function percentageValidation(input) {
	const value = parseInt(input, 10);
	return value >= 1 && value <= 100 ? true : "Invalid percentage. Please enter a value between 1 and 100.";
}

function urlValidation(input) {
	return isValidUrl(input) ? true : "Invalid URL. Please enter a valid URL.";
}

function urlsValidation(input) {
	try {
		const urls = input.split(",").map(s => s.trim());
		for (let i = 0; i < urls.length; i++) {
			if (!isValidUrl(urls[i])) {
				return "Invalid URL. Please enter a valid URL.";
			};
		};
		return true;
	} catch (error) {
		return false;
	}
}

function outputFolderValidation(input) {
	return fs.existsSync(input) ? true : "Output folder not found. Please enter a valid folder path.";
}

function keymanagerTokenFolderValidation(input) {
	return fs.existsSync(input) ? true : "Token folder not found. Please enter a valid folder path.";
}

function operatorIdValidation(value) {

	// Don't allow decimal numbers
	if (value.includes(".")) {
		return "Please enter a valid integer greater than 0 for the operator ID.";
	}

	const intValue = parseInt(value, 10);
	if (isNaN(intValue) || intValue <= 0) {
		return "Please enter a valid integer greater than 0 for the operator ID.";
	}
	return true;
}

function passwordValidation(value) {
	return value.trim() !== "" ? true : "The password cannot be empty.";
}

function moduleIdValidation(value) {
	return value != "" ? true : "The module ID cannot be empty.";
}

// Export all validation functions
module.exports = {
	percentageValidation,
	passwordValidation,
	outputFolderValidation,
	keymanagerTokenFolderValidation,
	operatorIdValidation,
	urlValidation,
	moduleIdValidation,
	urlsValidation,
};
