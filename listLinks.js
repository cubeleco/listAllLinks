var prefs = {
	searchStr: '',
	invertCheck: false,
	ignoreCheck: false,
	firstPartyCheck: false,
	hideText: false,
	ignoreCollapsed: false,
	categorySpacer: false,
	prependTextLinks: false,
	bookmarkFolders: '',
	detailsOpen: []
}

//save state of links arrays for searching
var links;

function toggleTextLinks() {
	document.getElementById('linksTable').classList.toggle('hideText');
}
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

function statusMessage(message) {
	let statusElem = document.getElementById('statusMessage');
	statusElem.textContent = message;
	statusElem.classList.remove('hidden');
	
	//after timeout hide message
	window.setTimeout(function removeMessage() {
		statusElem.classList.add('hidden');
	}, 3000);
}

function saveView(ev) {
	prefs.searchStr = document.getElementById('searchBar').value;
	prefs.invertCheck = document.getElementById('invertSearch').checked;
	prefs.ignoreCheck = document.getElementById('ignoreCase').checked;
	prefs.firstPartyCheck = document.getElementById('firstPartySearch').checked;
	prefs.hideText = document.getElementById('linksTable').classList.contains('hideText');

	prefs.ignoreCollapsed = document.getElementById('ignoreCollapsed').checked;
	prefs.categorySpacer = document.getElementById('categorySpacer').checked;
	prefs.prependTextLinks = document.getElementById('prependTextLinks').checked;
	prefs.bookmarkFolders = document.getElementById('bookmarkFolders').value;

	let detailsElem = document.querySelectorAll('details');
	//save whether each detail is open
	for(let d=0; d < detailsElem.length; d++) {
		prefs.detailsOpen[d] = detailsElem[d].open;
	}
	//save to local storage
	function markSaved(ev) {
		statusMessage('View saved');
	}
	chrome.storage.local.set(prefs).then(markSaved);
}

function loadView(storage) {
	prefs = storage;
	document.getElementById('searchBar').value = prefs.searchStr;
	document.getElementById('invertSearch').checked = prefs.invertCheck;
	document.getElementById('ignoreCase').checked = prefs.ignoreCheck;
	document.getElementById('firstPartySearch').checked = prefs.firstPartyCheck;
	if(prefs.hideText)
		toggleTextLinks();

	document.getElementById('ignoreCollapsed').checked = prefs.ignoreCollapsed;
	document.getElementById('categorySpacer').checked = prefs.categorySpacer;
	document.getElementById('prependTextLinks').checked = prefs.prependTextLinks;
	if(prefs.bookmarkFolders !== '')
		document.getElementById('bookmarkFolders').value = prefs.bookmarkFolders;

	let detailsElem = document.querySelectorAll('details');
	//open details
	for(let d=0; d < detailsElem.length; d++) {
		detailsElem[d].open = prefs.detailsOpen[d];
	}
	//apply search from saved view after finishing setup
	search();
}

function copyLinks() {
	let list = searchArr();
	let text = '';
	for(let l of list)
		//array can be strings or anchor elements converted automatically using toString
		text += l + '\n';
	navigator.clipboard.writeText(text);
	statusMessage(list.length + ' lines copied');
}

function openPlainText() {
	let list = searchArr();
	if(list.length < 1) {
		statusMessage('No links to open');
		return;
	}

	let array = [list.join('\n')];
	let blob = new Blob(array, {type: 'text/plain'});
	window.open(URL.createObjectURL(blob), '_blank');
}
function bookmarkLinks() {
	let foldElem = document.getElementById('bookmarkFolders');
	let titleElem = document.getElementById('bookmarkTitle');
	let list = searchArr(false);
	if(list.length < 1) {
		statusMessage('No bookmarks to save');
		return;
	}

	//create folder using saved or selected folderId and original title
	chrome.bookmarks.create({parentId: foldElem.value, title: titleElem.value}).then(createBookmarks);
	
	function createBookmarks(folder) {
		//reverse iteration because the default adds to the beginning of folder
		for(let l=list.length-1; l >= 0; l--) {
			chrome.bookmarks.create({
				url: list[l].href,
				parentId: folder.id
			});
		}
		statusMessage(list.length + ' bookmarks saved');
	}
}

//returns currently searched links as an array of strings
function searchArr(formatting = true) {
	let ignoreCollapsed = document.getElementById('ignoreCollapsed').checked;
	//formatting=false removes category labels and text from links for when saving bookmarks
	let labelCategories = document.getElementById('categorySpacer').checked && formatting;
	let addLinkText = document.getElementById('prependTextLinks').checked && formatting;

	let list = [];
	let textLinks = document.getElementById('linksTable').parentElement;
	let isTextTableOpen = textLinks.hasAttribute('open');
	//avoid adding collapsed details if option is unchecked, also if list is empty
	if(( isTextTableOpen || ignoreCollapsed ) && !textLinks.classList.contains('emptyList')) {
		list = [...document.querySelectorAll('#textLinks > tr:not(.hidden) a')];
		if(addLinkText) {
			let text = document.querySelectorAll('#textLinks > tr:not(.hidden) > td:first-child');
			let arr = [];

			for(let a in list) {
				arr.push(text[a].textContent.trim());
				arr.push(list[a]);
			}
			list = arr;
		}
	}

	for(let id of ['stylesheet', 'script', 'image', 'audio', 'video', 'iframe', 'misc']) {
		let elem = document.getElementById(id).parentElement;
		//avoid adding categories using spread syntax
		let categoryText = labelCategories ? [id + ': '] : [];
		if(( elem.hasAttribute('open') || ignoreCollapsed ) && !elem.classList.contains('emptyList'))
			//add category text and avoid links hidden from search
			list = [...list, ...categoryText, ...elem.querySelectorAll('a:not(.hidden)')];
	}

	return list;
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
	document.getElementById('bookmarkTitle').value = 'Link List: ' + message.title;

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

	//list bookmark folders
	let foldElem = document.getElementById('bookmarkFolders');
	chrome.bookmarks.getTree().then(recurseBookmarks).then(cleanupBookmarks);

	function recurseBookmarks(tree, depth = '') {
		for(let f of tree) {
			//only add folders
			if(f.url !== undefined)
				continue;
			let elem = document.createElement('option');
			elem.textContent = depth + '|' + f.title;
			elem.value = f.id;
			foldElem.append(elem);

			recurseBookmarks(f.children, depth+'-');
		}
	}
	//cleanup first layer since root cannot be saved to
	function cleanupBookmarks() {
		foldElem.children[0].remove();
		for(let e of foldElem.children) {
			e.textContent = e.textContent.slice(1);
		}

		//load saved view
		chrome.storage.local.get(prefs, loadView);
	}
}

//request links object from background.js
chrome.runtime.sendMessage('getLinks').then(setup);

//save links controls
document.getElementById('copyButton').addEventListener('click', copyLinks);
document.getElementById('plainTextButton').addEventListener('click', openPlainText);
document.getElementById('bookmarkButton').addEventListener('click', bookmarkLinks);
//page filtering controls
document.getElementById('toggleText').addEventListener('click', toggleTextLinks);
document.getElementById('expandAll').addEventListener('click', expandDetails);
document.getElementById('collapseAll').addEventListener('click', expandDetails);
document.getElementById('saveView').addEventListener('click', saveView);
document.getElementById('searchBar').addEventListener('keydown', searchInput);
document.getElementById('invertSearch').addEventListener('change', search);
document.getElementById('ignoreCase').addEventListener('change', search);
document.getElementById('firstPartySearch').addEventListener('change', firstPartySearch);
document.addEventListener('keydown', hotkeys);
