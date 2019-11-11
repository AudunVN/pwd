/*
	main.js

	Contains the main functionality of the website, and implements
	the most important event handlers for responding to user inputs.

	This is also the main entry point for code from other script modules
	used on the website, such as those for handling credentials and dialogs.
*/

// UTILITY FUNCTIONS
function htmlToElement(html) {
	// generates a DOM element from a HTML string

	// docs: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template
    let template = document.createElement('template'); 
    template.innerHTML = html;
    return template.content.firstChild;
}

function setView(viewId) {
	// handles changing between different "pages" depending on user inputs and site state
	
	let views = document.querySelectorAll(".view");
	let viewContainer = document.querySelector("body");

	views.forEach(function(view) {
		viewContainer.setAttribute('data-view', viewId);
		
		if (view.id == viewId) {
			view.classList.add("active");
		} else {
			view.classList.remove("active");
		}
	});
}

// PAGE INIT
/*
	Contains code that will be executed when the page is opened.
*/

setView("login");

// EVENT HANDLERS
/* 
	Event listeners for these have been assigned using the onclick attribute
	in index.html, to make it easier to see the connections between
	the buttons in HTML and the code they run.
*/

function showLoginDialog(message) {
	let dialog = showDialog(
		"Log in",
		message + 
		'<p>Please enter your passphrase.</p>' +
		'<div class="form-input">' +
			'<label for="passphrase">Enter passphrase</label>' +
			'<input type="password" id="passphrase">' +
		'</div>',
		"<button onclick=\"doLogin()\" class='button button-main close-dialog-button' role='button'>Log in</button>"
	);

	dialog.querySelector("input").addEventListener("keyup", function(event) {
		if (event.key === "Enter") {
			doLogin();
		}
	});
}

async function doLogin() {
	// attempts to load a set of previously stored credentials from local storage

	let passphraseHash = await cryptography.hash(document.querySelector("#passphrase").value);

	if (storage.hasData(passphraseHash)) {
		let storedData = storage.loadData(passphraseHash);
		let decryptedData = await cryptography.decrypt(storedData, passphraseHash);
		
		data = decryptedData;

		renderCredentials(data);
		setView('main');
		hideDialog();
	} else {
		showLoginDialog("<p><strong>Incorrect passphrase entered, please try again.</strong></p>");
	}
}

function showRegisterDialog(message) {
	let dialog = showDialog(
		"Set passphrase",
		message + 
		'<p>Please enter your passphrase. You will be able to change this later, but note that your stored credentials cannot be recovered if you forget it.</p>' + 
		'<div class="form-input">' +
			'<label for="passphrase">Enter passphrase</label>' +
			'<input type="password" id="passphrase">' +
	    '</div>' +
		'<div class="form-input">' +
			'<label for="confirm-passphrase">Confirm passphrase</label>' +
			'<input type="password" id="confirm-passphrase">' +
	    '</div>',
		"<button onclick=\"doRegister()\" class='button button-main' role='button'>Continue</button> <button class='button button-possibly-bad close-dialog-button' role='button'>Cancel</button>"
	);

	for (const input of dialog.querySelectorAll("input")) {
		input.addEventListener("keyup", function(event) {
			if (event.key === "Enter") {
				doRegister();
			}
		});
	}
}

function doRegister() {
	// sets up a new set of credentials for a new user

	let passphrase = document.querySelector("#passphrase").value;
	
	let validationErrors = validatePassphrase(passphrase);

	if (document.querySelector("#confirm-passphrase").value != passphrase) {
		validationErrors.push("Entered passwords do not match");
	}

	if (validationErrors.length == 0) {
		setPassphrase(passphrase);
		renderCredentials(data);
		insertBlankCredential();
		setView('main');
		hideDialog();

		return;
	}

	let errorMessageString = renderErrorMessages(validationErrors);

	showRegisterDialog(errorMessageString);
}

function doLogout() {
	data = new initialData();

	for (const credential of document.querySelectorAll(".credential")) {
		credential.remove();
	}

	setView('login');
}

function showImportDialog(message) {
	let dialog = showDialog(
		"Import credentials",
		message + 
		'<p style="margin-bottom: 1rem;">Please select a credentials file and enter the passphrase for it.</p>' + 
		'<div class="form-input">' +
			'<label for="import-file">Select file</label>' +
			'<input type="file" accept=".bak" id="import-file">' +
		'</div>' +
		'<div class="form-input">' +
			'<label for="passphrase">Enter passphrase</label>' +
			'<input type="password" id="passphrase">' +
	    '</div>',
		"<button onclick=\"doImport()\" class='button button-good' role='button'>Import</button> <button class='button button-possibly-bad close-dialog-button' role='button'>Cancel</button>"
	);

	dialog.querySelector("#passphrase").addEventListener("keyup", function(event) {
		if (event.key === "Enter") {
			doImport();
		}
	});
}

async function doImport() {
	// loads credentials from an encrypted exported file

	let file = document.querySelector("#import-file").files[0];

	let passphraseHash = await cryptography.hash(
		document.querySelector("#passphrase").value
	);

	let reader = new FileReader();

	reader.onload = async function(e) {
		try {
			let fileContents = e.target.result;

			if (fileContents.length != 0 && fileContents != "") {
				let encryptedData = JSON.parse(fileContents);
				let loadedData = await cryptography.decrypt(encryptedData, passphraseHash);
	
				if (loadedData.passphraseHash == passphraseHash) {
					data = loadedData;
					renderCredentials(data);
					setView('main');
					hideDialog();
				}
			}
		} catch (e) {
			showImportDialog("<p><strong>Incorrect passphrase or invalid file, please try again.</strong></p>");
			console.log(e);
		}
	};

	reader.onerror = function(e) {
		showImportDialog("<p><strong>Could not open file, please try again.</strong></p>");
	}

	reader.readAsText(file, "UTF-8");
}

async function doExport() {
	// triggers a download of a file containing an encrypted copy of the current credentials

	let encryptedData = await cryptography.encrypt(data, data.passphraseHash);
	storage.exportData(encryptedData, "credentials-export-" + Date.now() + ".bak");
}

async function saveSettings() {
	// currently only handles passphrase changes; reencrypts locally stored credentials

	let oldPassphrase = document.querySelector("#old-passphrase").value;
	let newPassphrase = document.querySelector("#new-passphrase").value;

	let validationErrors = validatePassphrase(newPassphrase);

	let oldPassphraseHash = await cryptography.hash(oldPassphrase);

	if (oldPassphraseHash != data.passphraseHash) {
		validationErrors.push("Incorrect old password entered");
	}

	if (document.querySelector("#confirm-new-passphrase").value != newPassphrase) {
		validationErrors.push("Entered new passwords do not match");
	}

	document.querySelector("#old-passphrase").value = "";
	document.querySelector("#new-passphrase").value = "";
	document.querySelector("#confirm-new-passphrase").value = "";

	if (validationErrors.length == 0) {
		setPassphrase(newPassphrase);
		showDialog(
			"Passphrase updated",
			"<p>Your passphrase has been updated.</p>",
			"<button class='button button-main close-dialog-button' role='button'>Close</button>"
		);
		return;
	}

	let errorMessageString = renderErrorMessages(validationErrors);

	showDialog(
		"Error",
		"<p>Could not update your passphrase:</p>" +
		errorMessageString +
		"<p>Please try again.</p>",
		"<button class='button button-main close-dialog-button' role='button'>Close</button>"
	);
}

for (const input of document.querySelectorAll("#settings-form input")) {
	input.addEventListener("keyup", function(event) {
		if (event.key === "Enter") {
			saveSettings();
		}
	});
}