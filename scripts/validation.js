/*
	validation.js

	Handles validation of various user inputs, such as
	passphrases when creating a new one.
*/

function validatePassphrase(passphrase) {
	let minLength = 5;
	let maxLength = 64;
	let errorMessages = [];

	if (passphrase.length > maxLength) {
		errorMessages.push(
			"Passphrase too long, maximum length is " + maxLength + 
			" characters but entered passphrase was " + passphrase.length + " characters long."
		);
	}
	
	if (passphrase.length < minLength) {
		errorMessages.push(
			"Passphrase too short, minimum length is " + minLength + 
			" characters but entered passphrase was " + passphrase.length + " characters long."
		);
	}

	return errorMessages;
}

function renderErrorMessages(errorMessages) {
	let string = "<p><ul>"
	for (let i = 0; i < errorMessages.length; i++) {
		string += "<li><strong>" + errorMessages[i] + "</strong></li>";
	}
	return string + "</ul></p>";
}

function isValidUrl(string) {
	try {
		new URL(string);
		return true;
	} catch (e) {
		return false;  
	}
}
