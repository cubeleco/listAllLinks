//block scope for cleaning up variables
{
//create return object
let links = {
	//create links and link text arrays
	linkRef: [],
	linkText: [],
	stylesheet: [],
	script: [],
	image: [],
	audio: [],
	video: [],
	iframe: [],
	misc: [], //fav icon, rss, meta links
};

//regular expression for hrefs if they at least have a protocol
const urlExp = /:\/\//;
//link rel attributes to ignore: prefetching and stylesheets
const relIgnoreExp  = /stylesheet|dns-prefetch|preconnect|prefetch|preload|prerender/;
//capture non data: urls in css files
//const cssUrlExp = /url\([\"\']?(?!data\:)([^\"]*)[\"\']?\)/g;

//basic page info
links.title = document.title;
links.docurl = document.URL;
//const origin = document.location.origin;

//construct regular expression string for first party search
//leave hostname blank for local files
if(document.location.hostname) {
	//create base domain regular expression
	links.domainExp = '(?=' + document.location.hostname.replaceAll('.', '\\.') + ').*';
}

//clickable and hidden links
for(let l of document.links) {
	//ignore script based links
	if(urlExp.test(l.href)) {
		links.linkRef.push(l.href);
		links.linkText.push(l.textContent);
	}
}

//stylesheets
for(let sty of document.styleSheets) {
	//exteral stylesheets
	if(urlExp.test(sty.href))
		links.stylesheet.push(sty.href);

	/*
	//fonts, background-images, image masks
	//TODO: cssRules is inaccessible from 3rd party
	//check if stylesheet is loaded
	if(Object.hasOwn(sty, 'cssRules')) {
		for(let rule of sty.cssRules) {
			let match = true;
			while(match) {
				match = cssUrlExp.exec(rule.cssText);
				if(!match)
					break;

				//if relative link
				if(match[1][0] === '/') {
					//make relative links into absolute links
					match[1] = origin + match[1];
				}

				links.font.push(match[1]);
			}
		}
	}
	*/
}

//head meta and misc links
for(let link of document.querySelectorAll('link[href]')) {
	if(!relIgnoreExp.test(link.rel))
		links.misc.push(link.href);
}

//script sources
for(let sc of document.scripts) {
	if(sc.src)
		links.script.push(sc.src);
}

//image elements
for(let im of document.images) {
	//ignores blob: and data: src's
	if(urlExp.test(im.src))
		links.image.push(im.src);
}

//audio elements
for(let aud of document.body.querySelectorAll('audio')) {
	if(aud.src)
		links.video.push(aud.src);
}

//video elements
for(let vid of document.body.querySelectorAll('video')) {
	if(vid.src)
		links.video.push(vid.src);
}

//iframes
for(let frame of document.body.querySelectorAll('iframe')) {
	if(frame.src)
		links.iframe.push(frame.src);
}

//return object to popup script
links;
}
