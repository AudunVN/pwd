/*
	credentials.js

	Contains the object that stores the currently active credentials,
	and functions for interacting with and displaying properties from
	this object.
*/

function initialData() {
	this.passphraseHash = "";
	this.lastExport = 0;
	this.credentials = [];
}

// stores the currently active set of credentials and settings
let data = new initialData();

// GET FUNCTIONS
// will return (computed) properties of the active credentials set

function getCredential(id) {
	let credential_template = {
		id: 0,
		lastUpdate: 0,
		targetName: "Title",
		description: "Description",
		fields: [
			{
				name: "Username",
				value: "",
				hidden: false
			},
			{
				name: "Password",
				value: generatePassphrase(32),
				hidden: true
			},
			{
				name: "Login page",
				value: "https://example.com",
				hidden: false
			}
		]
	}

	// look through loaded credentials for one with a matching id
	for (let i = 0; i < data.credentials.length; i++) {
		let loadedCredential = data.credentials[i];
		if (loadedCredential.id == id) {
			return loadedCredential;
		}
	}

	// no matches were found, return empty template credential
	return credential_template;
}

function getCurrentIds(credentials) {
	let ids = [];

	for (let i = 0; i < credentials.length; i++) {
		ids.push(credentials[i].id);
	}
	
	return ids;
}

function generateNewId(currentIds) {
	let id = Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - 1)) + 1;
	
	if (currentIds.includes(id)) {
		// id already exists, generate a new one
		return generateNewId(currentIds);
	}

    return id;
}

// SET FUNCTIONS
// will update or otherwise change properties of the active credential set

async function setPassphrase(passphrase) {
	data.passphraseHash = await cryptography.hash(passphrase);
	storeCredentials(data);
}

function storeCredential(credential) {
	if (getCredential(credential.id).id != 0) {
		data.credentials = data.credentials.filter(x => x.id !== credential.id);
	}

	data.credentials.push(credential);

	storeCredentials(data);
}

function removeCredential(credential) {
	if (getCredential(credential.id).id != 0) {
		data.credentials = data.credentials.filter(x => x.id !== credential.id);
	}

	storeCredentials(data);
}

async function storeCredentials(credentials) {
	let encryptedCredentials = await cryptography.encrypt(credentials, credentials.passphraseHash);

	storage.storeData(credentials.passphraseHash, encryptedCredentials);
}

// UTILITY FUNCTIONS
// used for various tasks related to the active credential set

async function loadCredentials(passphraseHash) {
	// returns unencrypted credentials from local storage, if they exist

	if (storage.hasData(passphraseHash)) {
		let encryptedData = storage.loadData(passphraseHash);
		let decryptedData = await cryptography.decrypt(
			encryptedData,
			passphraseHash
		);

		return decryptedData;
	}
}

function generatePassphrase(length) {
	let passphrase = '';
	let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (let i = 0; i < characters.length; i++) {
		passphrase += characters.charAt(Math.floor(Math.random() * characters.length));
	}

	return passphrase;
 }

// DOM-RELATED FUNCTIONS
// used for rendering credentials to the DOM and/or reading credential changes back from the user

function formToCredential(form) {
	// generates a new credential object from a form DOM element

	return {
		id: parseInt(form.getAttribute("data-id")),
		lastUpdate: Date.now(),
		targetName: form.querySelector(".credential-title").innerText,
		description: form.querySelector(".credential-description").innerText,
		fields: (function(){
			let fields = [];
			for (const field of form.querySelectorAll(".credential-field")) {
				let name = field.querySelector(".field-name").innerText;
				let value = field.querySelector(".field-value").innerText;

				// check to avoid storing empty fields
				if (name != "" || value != "") {
					fields.push(
						{
							name: name,
							value: value,
							hidden: field.classList.contains("hide-value")
						}
					);
				}
			}
			return fields;
		})()
	};
}

function bindFieldHandlers(field, form) {
	field.querySelector(".show-field-value").addEventListener("click", function(){
		if (form.classList.contains("editing")) {
			field.classList.remove("value-hidden");
		}
		field.classList.remove("hide-value");
	});

	field.querySelector(".hide-field-value").addEventListener("click", function(){
		if (form.classList.contains("editing")) {
			field.classList.add("value-hidden");
		}
		field.classList.add("hide-value");
	});

	field.querySelector(".remove-field").addEventListener("click", function(){
		if (form.classList.contains("editing")) {
			field.remove();
		}
	});

	field.querySelector(".copy-field-value").addEventListener("click", function(){
		navigator.clipboard.writeText(field.querySelector(".field-value").innerText);
	});
}

function bindFormHandlers(form) {
	form.querySelector(".edit-credential").addEventListener("click", function(){
		setFormMode(form, "editing");
	});

	form.querySelector(".add-field").addEventListener("click", function(){
		if (form.classList.contains("editing")) {
			let field = htmlToElement(
				renderField({
					name: "",
					value: "",
					hidden: false
				})
			);
			
			for (const input of field.querySelectorAll(".content-editable")) {
				input.setAttribute("contenteditable", true);
			}

			bindFieldHandlers(field, form);

			form.querySelector(".credential-info").appendChild(field);
		}
	});

	form.querySelector(".save-credential").addEventListener("click", function(){
		let id = parseInt(form.getAttribute("data-id"));

		if (!id || id == 0) {
			form.setAttribute("data-id", generateNewId(getCurrentIds(data)));
		}
		
		storeCredential(formToCredential(form));
		setFormMode(form, "viewing");
	});

	form.querySelector(".cancel-editing").addEventListener("click", function(){
		let id = parseInt(form.getAttribute("data-id"));
		if (id && id != 0) {
			form.parentNode.replaceChild(getCredentialHtmlElement(getCredential(id)), form);
		}
		else
		{
			form.parentNode.removeChild(form);
		}
	});

	form.querySelector(".delete-credential").addEventListener("click", function(){
		var dialog = showDialog(
			"Remove credential",
			"<p>Are you sure you want to remove this credential?</p>",
			"<button class='button button-bad' id='confirm-delete' role='button'>Delete</button> <button class='button close-dialog-button' role='button'>Cancel</button>"
		);

		dialog.querySelector("#confirm-delete").addEventListener("click", function(){
			let id = parseInt(form.getAttribute("data-id"));
			if (id && id != 0) {
				formToCredential(form);
				removeCredential(formToCredential(form));
			}
			form.parentNode.removeChild(form);
			hideDialog();
		});
	});

	for (const field of form.querySelectorAll(".credential-field")) {
		bindFieldHandlers(field, form);
	}
}

function renderField(field) {
	// renders a form field object to a HTML string

	let linkButton = (function(){
		if (isValidUrl(field.value)) {
			return '<a href="' + field.value + '" class="button button-main open-link" target="_BLANK">Open</a>'
		}

		return "";
	})();

	let fieldClass = (function(){
		let classes = [];

		if (isValidUrl(field.value)) {
			classes.push("is-url");
		}

		if (field.hidden) {
			classes.push("value-hidden");
			classes.push("hide-value");
		}

		return classes.join(" ");
	})();

	return '' +
	'<div class="credential-field row ' + fieldClass + '">' +
		'<div class="col-3">' +
			'<h4 class="field-name content-editable">' + field.name + '</h4>' +
		'</div>' +
		'<div class="col-6">' +
			'<span class="field-value content-editable">' + field.value + '</span>' +
		'</div>' +
		'<div class="col-3 field-actions">' +
			'<div class="button-container">' +
				linkButton +
				'<button type="button" class="button button-possibly-bad show-field-value">Show</button>' +
				'<button type="button" class="button hide-field-value">Hide</button>' +
				'<button type="button" class="button copy-field-value">Copy</button>' +
				'<button type="button" class="button button-bad remove-field">Remove</button>' +
			'</div>' +
		'</div>' +
	'</div>';
}

function renderCredential(credential) {
	// renders a credential object to a HTML string
	
	let fields = (function() { 
		// renders fields to a HTML string
		let fieldsString = '';

		for (let i = 0; i < credential.fields.length; i++) {
			let field = credential.fields[i];
			fieldsString += renderField(field);
		}

		return fieldsString;
	})();

	let id = (function() { 
		if (typeof credential.id !== 'undefined' && credential.id != 0) {
			return credential.id;
		}

		return 0;
	})();

	let output = '' +
	'<div class="credential" data-id="' + id + '">' +
		'<div class="credential-info">' +
			'<h3 class="credential-title content-editable">' + credential.targetName + '</h3>' +
			'<span class="credential-description content-editable">' + credential.description + '</span>' +
			fields +
		'</div>' +
		'<div class="credential-actions">' +
			'<div class="button-container">' +
				'<button type="button" class="button button-main save-credential">Save</button>' +
				'<button type="button" class="button button-good add-field">Add field</button>' +
				'<button type="button" class="button button-possibly-bad edit-credential">Edit</button>' +
				'<button type="button" class="button button-bad delete-credential">Delete</button>' +
				'<button type="button" class="button button-possibly-bad cancel-editing">Cancel</button>' +
			'</div>' +
		'</div>' +
	'</div>';

	return output;
}

function getCredentialHtmlElement(credential) {
	// generates a HTML DOM element from a credential

	let htmlString = renderCredential(credential);
	let credentialElement = htmlToElement(htmlString);
	bindFormHandlers(credentialElement);

	return credentialElement;
}

function renderCredentials(data) {
	// renders all current credentials to the main view

	for (let i = 0; i < data.credentials.length; i++) {
		document.querySelector(".credentials").appendChild(
			getCredentialHtmlElement(data.credentials[i])
		);
	}
}

function insertBlankCredential() {
	// inserts a blank credential at the end of the credential list, ready for editing

	let newCredentialForm = getCredentialHtmlElement(getCredential(0));
	setFormMode(newCredentialForm, "editing");
	document.querySelector(".credentials").appendChild(
		newCredentialForm
	);
	document.querySelector("main").scrollTop = document.querySelector("main").scrollHeight;
}

function setFormMode(form, mode) {
	/*
		This handles changing the form mode by changing the contenteditable attributes
		when going to editing mode and/or restoring the rendered credential to match 
		the stored version when going back to viewing mode.active

		It was chosen to implement the form using contenteditable instead of dedicated
		inputs due to good browser support and the ease of using these for variable-length
		content; one major advantage of using a div instead of an input for the description
		is that it's trivial to get it to scale in height depending on the length of the input.
	*/

	if (mode == "editing") {
		if (!form.classList.contains("editing")) {
			form.classList.add("editing");
			for (const input of form.querySelectorAll(".content-editable")) {
				input.setAttribute("contenteditable", true);
			}
			for (const field of form.querySelectorAll(".credential-field.value-hidden")) {
				field.classList.add("hide-value");
			}
		}
	}
	else if (mode == "viewing")
	{
		if (form.classList.contains("editing")) {
			form.classList.remove("editing");

			for (const input of form.querySelectorAll(".content-editable")) {
				input.removeAttribute("contenteditable");
			}

			let storedCredential = formToCredential(form);
			form.parentNode.replaceChild(getCredentialHtmlElement(storedCredential), form);
		}
	}
}