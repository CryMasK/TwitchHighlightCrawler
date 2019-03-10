/* 呼叫的library */
const request = require('request'); // HTTP Request
const fs = require('fs'); // FileStream
const moment = require('moment'); // Date Message

const CLIENT_ID = require('./json/Config.json')['client_id']; // application register code
const CHANNEL = 'lirik';
const RECORD_START_AT = moment('2019-03-04T02:08:11Z');

const writingPromise = [];

function log(code, message, show=true){
	/* 
		00: 
	*/
	if (show){
		fs.appendFileSync('./event_log.txt', moment().format("YYYY/MM/DD kk:mm:ss A") + " | Error " + code.toString().padStart(2, "0") + ": " + message + "\n", "UTF-8");
	}
}

async function checkVideoInfo(channel, id){
	let filePath = './vod/' + channel + '/' + id + '/info.json'; // the path of video info
	let data;
	/* Check video info file */
	if ( ! fs.existsSync(filePath) ){ // if video info still not be created
		data = await getSpecifiedVideoInfo(id);
	}
	else {
		data = JSON.parse( fs.readFileSync(filePath) );
	}
	
	if (data['ntust_flag']){ // already been crawled
		return;
	}
	else {
		if (data['status'] == 'recorded'){ // broadcast is end, it can be crawled
			data['ntust_flag'] = true;
			
			
		}
		else if (data['status'] != 'recording'){ // not sure for broadcast status
			if ( moment().diff( moment(data['created_at']), 'days' ) < 3 ){ // if the broadcast start within last 3 day, we don't crawl
				data['ntust_flag'] = false; // mark as not crawling
				writingPromise.push(
					new Promise( (resolve, reject) => {
						fs.writeFile(filePath, data, (err) => {
							if (err) throw err;
							resolve();
						});
					})
				);
				return;
			}
			else { // the video is 3 days ago
				if (){
					
				}
				else {
					
				}
				data['ntust_flag'] = true;
				
				writingPromise.push(xxxxxxxxxxxxxxxxxxxxxx);
			}
		}
		else { // the broadcast is still streaming
			data['ntust_flag'] = false; // mark as not crawling
			writingPromise.push(
				new Promise( (resolve, reject) => {
					fs.writeFile(filePath, data, (err) => {
						if (err) throw err;
						resolve();
					});
				})
			);
			return;
		}
	}
}

function getSpecifiedVideoInfo(id){
	return new Promise(function (resolve, reject){
		request({
		url: 'https://api.twitch.tv/kraken/videos/' + id,
		headers:{
			'Accept': 'application/vnd.twitchtv.v5+json',
			'Client-ID': CLIENT_ID
			},
		method: "GET"
		}, function(error, res, body){
			let data = JSON.parse(body);
			console.log(data);
			resolve(data);
		});
	});
}

function getSpecifiedClipInfo(slug){
	return new Promise(function (resolve, reject){
		request({
		url: 'https://api.twitch.tv/kraken/clips/' + slug,
		headers:{
			'Accept': 'application/vnd.twitchtv.v5+json',
			'Client-ID': CLIENT_ID
			},
		method: "GET"
		}, function(error, res, body){
			let a = JSON.parse(body);
			console.log(a);
			console.log(a['clips'].length);
			console.log(a['_cursor']);
			
			resolve();
		});
	});
}

function crawlClipInfo(channel, cursor){
	if (! channel){
		return;
	}
	
	let queryString = {
		channel: channel,
		period: 'day',
		limit: 100,
	};
	if (cursor){
		queryString['cursor'] = cursor;
	}
	
	return new Promise(function (resolve, reject){
		request({
		url: 'https://api.twitch.tv/kraken/clips/top',
		qs: queryString,
		headers:{
			'Accept': 'application/vnd.twitchtv.v5+json',
			'Client-ID': CLIENT_ID
			},
		method: "GET"
		}, function(error, res, body){
			/*let a = JSON.parse(body);
			//console.log(a);
			//console.log(a['clips'].length);
			console.log(a['clips'][0]['vod']['id']);
			console.log(a['_cursor']);*/
			let data = JSON.parse(body);
			
			for (const clipInfo of data['clips']){
				if (clipInfo['vod']){ // check vod still can be access
					let dir = './vod/' + channel + '/' + clipInfo['vod']['id'] + '/clip';
				
					writingPromise.push( 
						new Promise( (resolve, reject) => {
							if ( ! fs.existsSync(dir) ){
								fs.mkdirSync( dir, {recursive: true} );
							}
							
							fs.writeFile(dir + '/' + clipInfo['slug'] + '.json', JSON.stringify(clipInfo), (err) => {
								if (err) throw err;
								resolve();
							});
						})
					);
				}
			}
			
			resolve(data['_cursor']);
		});
	});
}

function getChatMessage(id, cursor){
	return new Promise(function (resolve, reject){
		request({
		url: 'https://api.twitch.tv/v5/videos/' + id + '/comments?client_id=' + CLIENT_ID + '&' + ((cursor) ? 'cursor=' + cursor : 'content_offset_seconds=0'),
		method: "GET"
		}, function(error, res, body){
			resolve(body);
		});
	});
}

async function main(){
	//await getSpecifiedClipInfo();
	let cursor;
	/*do {
		cursor = await crawlClipInfo(CHANNEL, cursor);
	} while (cursor);*/
	
	/*let folderList = fs.readdirSync('./vod/' + CHANNEL); // video id list
	if (await checkVideoInfo())
	
	*/
	
	//await getSpecifiedVideoInfo('390174753');
	
	let l = 0;
	
	cursor = undefined; // clear
	let message_id = 1;
	do {
		let rawData = await getChatMessage(389178879, cursor);
		let data = JSON.parse(rawData);
		l += data['comments'].length
		cursor = data['_next'];
		/*writingPromise.push(
			new Promise( (resolve, reject) => {
				fs.writeFile('./Message-' + message_id + '.json', rawData, (err) => {
					if (err) throw err;
					resolve();
				});
			})
		);*/
		
		message_id ++;
		console.log(l);
	} while (cursor);
	console.log(l);
	console.log(message_id);
	//await Promise.all(writingPromise);
}

main();

/*
MTAw
MjAw
MzAw
NDAw
NTAw
NjAw
NzAw
ODAw
OTAw
MTAwMA==
*/
/* {"clips":[{"slug":"AlertAbnegateHummingbirdArgieB8","tracking_id":"397400461","url":"https://clips.twitch.tv/AlertAbnegateHummingbirdArgieB8?tt_medium=clips_api\u0026tt_content=url","embed_url":"https://clips.twitch.tv/embed?clip=AlertAbnegateHummingbirdArgieB8\u0026tt_medium=clips_api\u0026tt_content=embed","embed_html":"\u003ciframe src='https://clips.twitch.tv/embed?clip=AlertAbnegateHummingbirdArgieB8\u0026tt_medium=clips_api\u0026tt_content=embed' width='640' height='360' frameborder='0' scrolling='no' allowfullscreen='true'\u003e\u003c/iframe\u003e","broadcaster":{"id":"23161357","name":"lirik","display_name":"LIRIK","channel_url":"https://www.twitch.tv/lirik","logo":"https://static-cdn.jtvnw.net/jtv_user_pictures/7a75bd89-ecbf-4974-bc1f-6b967213595f-profile_image-150x150.png"},"curator":{"id":"51198247","name":"fenkell","display_name":"FENKELL","channel_url":"https://www.twitch.tv/fenkell","logo":"https://static-cdn.jtvnw.net/jtv_user_pictures/9b3efb127eddc708-profile_image-150x150.jpeg"},"vod":{"id":"378483958","url":"https://www.twitch.tv/videos/378483958?t=4h8m18s","offset":14898,"preview_image_url":"https://vod-secure.twitch.tv/_404/404_processing_320x240.png"},"broadcast_id":"32665293040","game":"Apex Legends","language":"en","title":"OMG!","views":159640,"duration":44.48,"created_at":"2019-02-10T22:23:53Z","thumbnails":{"medium":"https://clips-media-assets2.twitch.tv/AT-cm%7C397400461-preview-480x272.jpg","small":"https://clips-media-assets2.twitch.tv/AT-cm%7C397400461-preview-260x147.jpg","tiny":"https://clips-media-assets2.twitch.tv/AT-cm%7C397400461-preview-86x45.jpg"}},{"slug":"VivaciousDoubtfulBibimbapJKanStyle","tracking_id":"397825905","url":"https://clips.twitch.tv/VivaciousDoubtfulBibimbapJKanStyle?tt_medium=clips_api\u0026tt_content=url","embed_url":"https://clips.twitch.tv/embed?clip=VivaciousDoubtfulBibimbapJKanStyle\u0026tt_medium=clips_api\u0026tt_content=embed","embed_html":"\u003ciframe src='https://clips.twitch.tv/embed?clip=VivaciousDoubtfulBibimbapJKanStyle\u0026tt_medium=clips_api\u0026tt_content=embed' width='640' height='360' frameborder='0' scrolling='no' allowfullscreen='true'\u003e\u003c/iframe\u003e","broadcaster":{"id":"23161357","name":"lirik","display_name":"LIRIK","channel_url":"https://www.twitch.tv/lirik","logo":"https://static-cdn.jtvnw.net/jtv_user_pictures/7a75bd89-ecbf-4974-bc1f-6b967213595f-profile_image-150x150.png"},"curator":{"id":"51198657","name":"avantetv","display_name":"AvanteTV","channel_url":"https://www.twitch.tv/avantetv","logo":"https://static-cdn.jtvnw.net/jtv_user_pictures/5e421f5fe9ad5e52-profile_image-150x150.png"},"vod":{"id":"378985440","url":"https://www.twitch.tv/videos/378985440?t=18m6s","offset":1086,"preview_image_url":"https://vod-secure.twitch.tv/_404/404_processing_320x240.png"},"broadcast_id":"32682110240","game":"Apex Legends","language":"en","title":"Reckful in Aladdin","views":79292,"duration":21.75,"created_at":"2019-02-11T17:26:15Z","thumbnails":{"medium":"https://clips-media-assets2.twitch.tv/AT-cm%7C397825905-preview-480x272.jpg","small":"https://clips-media-assets2.twitch.tv/AT-cm%7C397825905-preview-260x147.jpg","tiny":"https://clips-media-assets2.twitch.tv/AT-cm%7C397825905-preview-86x45.jpg"}},{"slug":"ExquisiteLongKathySmoocherZ","tracking_id":"402747753","url":"https://clips.twitch.tv/ExquisiteLongKathySmoocherZ?tt_medium=clips_api\u0026tt_content=url","embed_url":"https://clips.twitch.tv/embed?clip=ExquisiteLongKathySmoocherZ\u0026tt_medium=clips_api\u0026tt_content=embed","embed_html":"\u003ciframe src='https://clips.twitch.tv/embed?clip=ExquisiteLongKathySmoocherZ\u0026tt_medium=clips_api\u0026tt_content=embed' width='640' height='360' frameborder='0' scrolling='no' allowfullscreen='true'\u003e\u003c/iframe\u003e","broadcaster":{"id":"23161357","name":"lirik","display_name":"LIRIK","channel_url":"https://www.twitch.tv/lirik","logo":"https://static-cdn.jtvnw.net/jtv_user_pictures/7a75bd89-ecbf-4974-bc1f-6b967213595f-profile_image-150x150.png"},"curator":{"id":"12777404","name":"plouffetv","display_name":"PlouffeTv","channel_url":"https://www.twitch.tv/plouffetv","logo":"https://static-cdn.jtvnw.net/jtv_user_pictures/d9840297-5d01-4274-be59-87a9716302aa-profile_image-150x150.png"},"vod":{"id":"382778303","url":"https://www.twitch.tv/videos/382778303?t=5h45m54s","offset":20754,"preview_image_url":"https://vod-secure.twitch.tv/_404/404_processing_320x240.png"},"broadcast_id":"32801628784","game":"Apex Legends","language":"en","title":"Opinion on cheaters, i love this guy jesus","views":67309,"duration":48.98,"created_at":"2019-02-18T22:49:52Z","thumbnails":{"medium":"https://clips-media-assets2.twitch.tv/AT-cm%7C402747753-preview-480x272.jpg","small":"https://clips-media-assets2.twitch.tv/AT-cm%7C402747753-preview-260x147.jpg","tiny":"https://clips-media-assets2.twitch.tv/AT-cm%7C402747753-preview-86x45.jpg"}}],"_cursor":"Mw=="} */