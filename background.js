//links objects indexed by tabid
var linksArr = [];
var isFox = chrome.hasOwnProperty('menus');
//alias for which context menu api is available
var menuApi = isFox ? browser.menus : chrome.contextMenus;

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

function toolbarAction(tab, opt) {
	//start content script in active tab
	chrome.scripting.executeScript({
		files: ['grabLinks.js'],
		target: {tabId: tab.id}
	}).then(setInfo, console.error);
}
function itemClicked(item, tab) {
	if(item.menuItemId === 'grabLinks') {
		toolbarAction(tab);
	}
}

function start() {
	let context = ['all'];
	//if Firefox add tab context type
	if(isFox)
		context.push('tab');

	//create context menus
	menuApi.create({
		id: 'grabLinks',
		title: 'List all Links',
		type: 'normal',
		contexts: context
	});
}
start();

//event listeners for context menu items
chrome.action.onClicked.addListener(toolbarAction);
menuApi.onClicked.addListener(itemClicked);
//listen for loaded link pages
chrome.runtime.onMessage.addListener(linkResponse);

