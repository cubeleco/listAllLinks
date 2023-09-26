//links objects indexed by tabid
var linksArr = [];

function linkResponse(message, sender, responseFunc) {
	if(message === 'getLinks') {
		//remove links object and send to tab
		responseFunc(linksArr.splice(sender.tab.id, 1)[0]);
	}
}

function setInfo(obj) {
	//show error on protected page
	if(!obj[0] || !obj[0].result) {
		console.log('Page is protected');
		return;
	}

	//create new tab for displaying links
	chrome.tabs.create({ url: 'listLinks.html' }).then((tab) => {
		//save links object for tabid
		linksArr[tab.id] =  obj[0].result;
	});
}

function itemClicked(item, tab) {
	if(item.menuItemId === 'grabLinks') {
		//start content script in active tab
		chrome.scripting.executeScript({
			files: ['grabLinks.js'],
			target: {tabId: tab.id}
		}).then(setInfo, console.error);
	}
}

function start() {
	//create context menus
	chrome.menus.create({
		id: 'grabLinks',
		title: 'List all Links',
		type: 'normal',
		contexts: ['page', 'tab']
	});
}
start();

//event listeners for context menu items
chrome.menus.onClicked.addListener(itemClicked);
//listen for loaded link pages
chrome.runtime.onMessage.addListener(linkResponse);

