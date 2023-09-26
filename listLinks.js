var prefs = {
	searchStr: '',
	invertCheck: false,
	ignoreCheck: false,
	firstPartyCheck: false,
	detailsOpen: [false, false, false, false, false, false, false, false]
}

//save state of links arrays for searching
var links;

function expandDetails(ev) {
	//bool to open or close all details
	const open = ev.target.id === 'expandAll';

	for(let d of document.querySelectorAll('details')) {
		d.open = open;
	}
}

function hotkeys(keyEv) {
	if(keyEv.key === '/') {
		//avoid preventDefault while search is focused
		if(keyEv.target.id === 'searchBar')
			return;
		document.getElementById('searchBar').focus();
		keyEv.preventDefault();
	}
	else if(keyEv.key === 'Escape') {
		document.activeElement.blur();
	}
}

function searchInput(keyEv) {
	if(keyEv.key === 'Enter' || !links) {
		search();
	}
}

//search all links using regular expression in searchBar
function search() {
	if(!links)
		return;

	const searchString = document.getElementById('searchBar').value;
	const invert = document.getElementById('invertSearch').checked;
	const flags = document.getElementById('ignoreCase').checked ?
		'i' : '';

	const exp = RegExp(searchString, flags);
	
	//display or hide links using search expression
	function filterLinks(listContainer, hrefArr) {
		const elements = listContainer.children;
		let numMatches = 0;

		for(let r in hrefArr) {
			//test each link string
			if(exp.test(hrefArr[r]) !== invert) {
				//show on match; remove hidden class from previous search
				elements[r].classList.remove('hidden');
				numMatches++;
			} else {
				//hide element
				elements[r].classList.add('hidden');
			}
		}

		//update link counts
		//text links table has different container for counts to work
		if(listContainer.id === 'textLinks')
			setLinkCount(document.getElementById('linksTable'), numMatches);
		else
			setLinkCount(listContainer, numMatches);
	}

	//filter link lists
	filterLinks(document.getElementById('textLinks'), links.linkRef);
	filterLinks(document.getElementById('stylesheet'), links.stylesheet);
	filterLinks(document.getElementById('script'), links.script);
	filterLinks(document.getElementById('image'), links.image);
	filterLinks(document.getElementById('audio'), links.audio);
	filterLinks(document.getElementById('video'), links.video);
	filterLinks(document.getElementById('iframe'), links.iframe);
	filterLinks(document.getElementById('misc'), links.misc);
}

function firstPartySearch(ev) {
	//ignore on local file
	if(!links.domainExp)
		return;

	let searchBar = document.getElementById('searchBar');
	if(ev.target.checked) {
		//set beginning of search to domain expression created earlier
		searchBar.value = links.domainExp + searchBar.value;
		search();
	} else if(searchBar.value.startsWith(links.domainExp)) {
		//remove domain expression from search
		searchBar.value = searchBar.value.substring(links.domainExp.length);
		search();
	}
}

function markSaved(ev) {
	//mark save button green
	document.getElementById('saveView').classList.add('saved');
	
	//clear mark class
	window.setTimeout(function removeSaved() {
		document.getElementById('saveView').classList.remove('saved')
	}, 5000);
}
function saveView(ev) {
	prefs.searchStr = document.getElementById('searchBar').value;
	prefs.invertCheck = document.getElementById('invertSearch').checked;
	prefs.ignoreCheck = document.getElementById('ignoreCase').checked;
	prefs.firstPartyCheck = document.getElementById('firstPartySearch').checked;

	let detailsElem = document.querySelectorAll('details');
	//save whether each detail is open
	for(let d=0; d < detailsElem.length; d++) {
		prefs.detailsOpen[d] = detailsElem[d].open;
	}
	//save to local storage
	chrome.storage.local.set(prefs).then(markSaved);
}

function loadView(storage) {
	prefs = storage;
	document.getElementById('searchBar').value = prefs.searchStr;
	document.getElementById('invertSearch').checked = prefs.invertCheck;
	document.getElementById('ignoreCase').checked = prefs.ignoreCheck;
	document.getElementById('firstPartySearch').checked = prefs.firstPartyCheck;

	let detailsElem = document.querySelectorAll('details');
	//open details
	for(let d=0; d < detailsElem.length; d++) {
		detailsElem[d].open = prefs.detailsOpen[d];
	}
	//apply search from saved view after finishing setup
	search();
}

function setLinkCount(elem, length) {
	//add link count to span element
	elem.parentElement.querySelector('span.listLength').textContent = length;

	//grey out on empty list
	if(length > 0)
		//not empty
		elem.parentElement.classList.remove('emptyList');
	else
		elem.parentElement.classList.add('emptyList');
}

//basic append link array to details element
function appendLinks(id, arr) {
	let elem = document.getElementById(id);

	setLinkCount(elem, arr.length);

	for(let l of arr) {
		let anchor = document.createElement('a');
		anchor.href = l;
		anchor.textContent = l;

		elem.append(anchor);
	}
}

function setup(message) {
	if(!message) {
		document.body.textContent = 'Failed to load Links.';
		return;
	}

	links = message;

	//hide first-party checkbox on local files
	if(!links.domainExp) {
		document.getElementById('firstPartySearch').classList.add('hidden');
		document.getElementById('firstPartySearch').nextElementSibling.classList.add('hidden');
	}

	//show basic page info
	let url = document.getElementById('url');
	url.textContent = message.docurl;
	url.href = message.docurl;

	document.title = 'Links for: ' + message.title;

	let linkTable = document.getElementById('textLinks');
	setLinkCount(document.getElementById('linksTable'), message.linkRef.length);

	//create table rows for each text link
	for(let i in message.linkRef) {
		let row = document.createElement('tr');
		let title = document.createElement('td');
		let link = document.createElement('td');
		let anchor = document.createElement('a');
		title.textContent = message.linkText[i];
		anchor.textContent = message.linkRef[i];
		anchor.href = message.linkRef[i];

		//add elements to table
		link.append(anchor);
		row.append(title, link);
		linkTable.append(row);
	}

	//list remaining links arrays
	appendLinks('stylesheet', message.stylesheet);
	appendLinks('script', message.script);
	appendLinks('image', message.image);
	appendLinks('audio', message.audio);
	appendLinks('video', message.video);
	appendLinks('iframe', message.iframe);
	appendLinks('misc', message.misc);

	//load saved view
	chrome.storage.local.get(prefs, loadView);
}

//request links object from background.js
chrome.runtime.sendMessage('getLinks').then(setup);

//page filtering controls
document.getElementById('expandAll').addEventListener('click', expandDetails);
document.getElementById('collapseAll').addEventListener('click', expandDetails);
document.getElementById('saveView').addEventListener('click', saveView);
document.getElementById('searchBar').addEventListener('keydown', searchInput);
document.getElementById('invertSearch').addEventListener('change', search);
document.getElementById('ignoreCase').addEventListener('change', search);
document.getElementById('firstPartySearch').addEventListener('change', firstPartySearch);
document.addEventListener('keydown', hotkeys);
