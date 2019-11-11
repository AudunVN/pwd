/* 
	crypto.js

	This module implements functionality for encrypting and decrypting stored data,
	and handling hashing of the user's passphrase.
*/

let webCryptoProvider = {
	/*
		For cryptography it was early on decided to use the Web Crypto API,
		as it greatly simplifies the task of creating a semi-secure
		encryption solution. It is a fairly recent addition, but has good browser
		support already.

		The specific settings and encryption methods are largely from
		 - https://webbjocke.com/javascript-web-encryption-and-hashing-with-the-crypto-api/
		and from Mozilla's documentation on the SubtleCrypto interface of the Web Crypto API
		 - https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto

		 The various calls to TextEncoder() and TextDecoder() are converting to and from
		 ArrayBuffers, which is the main input/output type for most things in the Web Crypto API.
	*/

	// various shared cryptography options, such as the algorithms used
	salt: "pAQoPLg8PTjsKuhpxGe8",
	hashAlgorithm: "SHA-256",
	cryptoAlgorithm: "AES-GCM",
	keyLength: 256,
	ivLength: 12,
	keyGenAlgorithm: {
		// algorithm object input for the key generator
		name: 'PBKDF2',
		hash: 'SHA-256',
		salt: new TextEncoder().encode(this.salt),
		iterations: 1000
	},
	isSupported() {
		// checks if browser supports the Web Cryptography API
		return !!(window.crypto && crypto.subtle && window.TextEncoder);
	},
	async hash(string) {
		if (this.isSupported()) {
			let hash = await crypto.subtle.digest(this.hashAlgorithm, new TextEncoder().encode(string));
			let hashString = String(new Uint8Array(hash));
			return btoa(hashString);
		}

		return false;
	},
	async generateKey(password) {
		if (this.isSupported()) {
			let derivedKeyAlgorithm = { name: this.cryptoAlgorithm, length: this.keyLength };
			let encodedPassword = new TextEncoder().encode(password);

			let key = await crypto.subtle.importKey('raw', encodedPassword, this.keyGenAlgorithm.name, false, ['deriveKey']);
			
			return crypto.subtle.deriveKey(this.keyGenAlgorithm, key, derivedKeyAlgorithm, false, ['encrypt', 'decrypt']);
		}

		return false;
	},
	async encrypt(data, password) {
		if (this.isSupported()) {
			/*
				crypto.subtle.encrypt() only supports encrypting strings; all encrypted
				data is therefore currently always stored as JSON for portability
			*/
			let string = JSON.stringify(data);

			let encryptionAlgorithm = {
				name: this.cryptoAlgorithm,
				length: this.keyLength,
				iv: crypto.getRandomValues(new Uint8Array(this.ivLength))
			};

			// generate new key based on our passphrase
			let key = await this.generateKey(password, this.cryptoAlgorithm, this.keyLength);

			let encodedInput = new TextEncoder().encode(string);

			// encrypt input using new key
			let encryptedOutput = await crypto.subtle.encrypt(encryptionAlgorithm, key, encodedInput);
			let cipherText = new Uint8Array(encryptedOutput);

			// the values need to be converted to regular arrays for JSON.stringify() to play nice with them
			return {
				cipherText: Array.prototype.slice.call(cipherText),
				/*
					AES-GCM uses an initialization vector (iv) to make the
					output more random; this vector does not need to be 
					stored securely, but must be included for decrypting the
					data afterwards. It is therefore passed to the output as-is.
				*/
				iv: Array.prototype.slice.call(encryptionAlgorithm.iv)
			};
		}

		return false;
	},
	async decrypt(data, password) {
		if (this.isSupported()) {
			let cipherText = new Uint8Array(data.cipherText);
			let iv = new Uint8Array(data.iv);

			let decryptionAlgorithm = {
				name: this.cryptoAlgorithm,
				length: this.length,
				iv: iv
			};

			// generate new key based on our passphrase
			let key = await this.generateKey(password, this.cryptoAlgorithm, this.keyLength);

			// test new key against our encrypted input
			let decrypted = await crypto.subtle.decrypt(decryptionAlgorithm, key, cipherText.buffer);
			let decryptedString = new TextDecoder().decode(decrypted);

			// encrypted data is currently always stored as JSON for portability
			let decryptedData = JSON.parse(decryptedString);

			return decryptedData;
		}

		return false;
	}

};

/*
	These assignments may seem a bit redundant, but they're
	here to provide modularity for later in case we wish
	to add additional storage providers which expose the
	same interfaces as "webCryptoProvider"; this lets us choose
	the type of encryption we wish to use by changing 
	"defaultCryptoProvider", without changing the main script since
	it still just sees and uses the "crypto" variable.
*/

let defaultCryptoProvider = webCryptoProvider;

let cryptography = defaultCryptoProvider;