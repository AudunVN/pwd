/* 
	storage.js

	This module implements functionality for managing long(ish)-term data storage,
	plus various helper functions for storing/loading data.
*/

let localStorageProvider = {
	isSupported() {
		return (typeof(Storage) !== "undefined");
	},
	serializeData(data) {
		return JSON.stringify(data);
	},
	parseDataString(string) {
		return JSON.parse(string);
	},
	storeData(key, data) {
		if (this.isSupported()) {
			localStorage.setItem(key, this.serializeData(data));
			return true;
		}
	
		return false;
	},
	loadData(key) {
		if (this.isSupported()) {
			let dataString = localStorage.getItem(key);
			
			if (dataString) {
				return this.parseDataString(dataString);
			}
		}
	
		return false;
	},
	hasData(key) {
		if (this.loadData(key) != false) {
			return true;
		}
	
		return false;
	},
	exportData(data, filename) {
		var link = document.createElement('a');

		link.setAttribute('href', 
			'data:text/plain;charset=utf-8,' + encodeURIComponent(this.serializeData(data))
		);

		link.setAttribute('download', filename);
		link.style.display = 'none';
		document.body.appendChild(link);
		
		link.click();
		
		document.body.removeChild(link);
	}
};

/*
	These assignments may seem a bit redundant, but they're
	here to provide modularity for later in case we wish
	to add additional storage providers which expose the
	same interfaces as "localStorageProvider"; this lets us choose
	the type of storage we wish to use by changing 
	"defaultStorageProvider", without changing the main script since
	it still just sees and uses the "storage" variable.
*/

let defaultStorageProvider = localStorageProvider;

let storage = defaultStorageProvider;