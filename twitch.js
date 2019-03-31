/* 呼叫的library */
const request = require('request'); // HTTP Request
const fs = require('fs'); // FileStream
const moment = require('moment'); // Date Message

const CLIENT_ID = require('./json/Config.json')['client_id']; // application register code
const CHANNEL_LIST = ['lirik'];
const VIDEO_ID = '389178879'
const RECORD_START_AT = moment('2019-03-04T02:08:11Z');

const writingPromise = [];
let afterWriting = {};

function log(code, message, show=true){
	/* 
		00: In checkVideoInfo(), the video status is not a known value
	*/
	if (show){
		fs.appendFileSync('./event_log.txt', moment().format("YYYY/MM/DD kk:mm:ss A") + " | Error " + code.toString().padStart(2, "0") + ": " + message + "\n", "UTF-8");
	}
}

function syncWriteData(path, data){
	writingPromise.push(
		new Promise( (resolve, reject) => {
			fs.writeFile(path, data, (err) => {
				if (err) throw err;
				resolve();
			});
		})
	);
}

async function checkVideoInfo(channel, id){ // check specified video chat room message is crawled
	let infoPath = './vod/' + channel + '/' + id + '/info.json'; // the path of video info
	let data;
	/* Check video info file */
	if ( ! fs.existsSync(infoPath) ){ // if video info still not be created
		data = await getSpecifiedVideoInfo(id);
	}
	else {
		data = JSON.parse( fs.readFileSync(infoPath) );
	}
	
	if (data['ntust_flag']){ // already been crawled
		return;
	}
	else {
		if (data['status'] == 'recorded'){ // broadcast is end, it can be crawled
			await crawlChatMessage(channel, id); // crawl chat room message
			
			data['ntust_flag'] = true;
			syncWriteData(infoPath, data);
			return;
		}
		else if (data['status'] != 'recording'){ // not sure for broadcast status
			log(0, checkVideoInfo.name + ' - Not known video status (' + id + ' - ' + data['status']);
		
			if ( moment().diff( moment(data['created_at']), 'days' ) < 3 ){ // if the broadcast start within last 3 day, we don't crawl
				data['ntust_flag'] = false; // mark as not crawling
				syncWriteData(infoPath, data);
				return;
			}
			else { // the video is 3 days ago
				await crawlChatMessage(channel, id); // crawl chat room message
			
				data['ntust_flag'] = true;
				syncWriteData(infoPath, data);
				return;
			}
		}
		else { // the broadcast is still streaming
			data['ntust_flag'] = false; // mark as not crawling
			syncWriteData(infoPath, data);
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
			//console.log(data);
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
			/*console.log(a['clips'].length);
			console.log(a['_cursor']);*/
			
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

async function crawlChatMessage(channel, id){ // get and store message data
	const crawlChatPromise = [];

	let cursor;
	let message_id = 1;
	do {
		let rawData = await getChatMessage(id, cursor);
		let data = JSON.parse(rawData);
		
		cursor = data['_next'];
		
		crawlChatPromise.push(
			new Promise( (resolve, reject) => {
				fs.writeFile('./vod/' + channel + '/' + id + '/Message-' + message_id + '.json', rawData, (err) => {
					if (err) throw err;
					resolve();
				});
			})
		);
		
		message_id ++;
	} while (cursor);
	
	return new Promise( async (resolve,reject) => {
		await Promise.all(crawlChatPromise);
		resolve();
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

function getBaseline(channel, video_id){
	let dir = './vod/' + channel + '/' + video_id + '/'
	
	let messageList = fs.readdirSync(dir); // video message list
	messageList = messageList.filter(filename => /Message-\d+\.json/.test(filename));
}

function evaluateLocalPrecisionAndRecall(channel, video_id){
	
	
	
}

async function main(){
	let cursor;
	
	/*for (const channel of CHANNEL_LIST){
		do {
			cursor = await crawlClipInfo(channel, cursor);
		} while (cursor);
	}
	
	for (const channel of CHANNEL_LIST){
		let folderList = fs.readdirSync('./vod/' + channel); // video id list
		for (const videoID of folderList){
			checkVideoInfo(channel, videoID);
		}
	}*/
	
	let videoLength = 28662;
	/*let commentFQ = new Array(videoLength).fill(0);
	let data;
	for (let i=1; i<=1276; i++){
		data = JSON.parse( fs.readFileSync('./vod/' + CHANNEL + '/' + VIDEO_ID + '/Message-' + i + '.json') );
		for ( const comment of data['comments'] ){
			let offset = Math.floor( comment['content_offset_seconds'] );
			commentFQ[offset] ++;
		}
	}
	
	commentFQ = commentFQ.slice(0, videoLength);
	console.log(commentFQ.length)
	
	writingPromise.push(
		new Promise( (resolve, reject) => {
			fs.writeFile('./comments.json', JSON.stringify(commentFQ), (err) => {
				if (err) throw err;
				resolve();
			});
		})
	);*/
	
	let commentFQ = require('./comments.json');
	let predictedFragment = new Array(videoLength).fill(0);
	let globalPredictedFragment = new Array(videoLength).fill(0),
		globalClip =  new Array(videoLength).fill(0);
		
	let	globalPredictedFragmentLength = 0,
		globalClipLenght = 0; // for global precision & recall computing
	let predictedFragmentCount = 0; // for precision computing
	
	let sum = 72423;
	/*for (let i=0; i<videoLength; i++){
		sum += commentFQ[i];
	}
	console.log(sum);
	console.log(sum/3600);*/
	
	/**/let avgComentFrequency = sum / videoLength;
	let strike = 0;
	for (let i=0; i<videoLength; i++){
		if (commentFQ[i] > avgComentFrequency){
			strike ++
		}
		else {
			if (strike >= 5){
				let index = i - strike;
				predictedFragment[index] = {};
				predictedFragment[index]['duration'] = strike;
				predictedFragment[index]['precision'] = [];
				//console.log(i-strike + ' ' + strike)
				
				predictedFragmentCount ++;
				
				for (let j=index; j<i; j++){
					globalPredictedFragment[j] = 1;
				}
				globalPredictedFragmentLength += strike;
			}
			
			strike = 0;
		}
	}
	
	/*let testi = 12990
	predictedFragment[testi] = {};
	predictedFragment[testi]['duration'] = 13;
	predictedFragment[testi]['precision'] = [];*/
	
	let localPrecision = 0,
		localRecall = 0;
	let localBestPrecision = 0,
		localBestRecall = 0;
	
	let clipMiss = 0;
	let offsetToLeft = 0,
		offsetToRight = 0,
		noOffset = 0;
	
	const MAX_CLIP_LENGTH = 60,
		MIN_CLIP_LENGTH = 5;
	let clipList = fs.readdirSync('./vod/' + CHANNEL_LIST[0] + '/' + VIDEO_ID + '/clip')
	for (const clip of clipList){
		let data = JSON.parse( fs.readFileSync('./vod/' + CHANNEL_LIST[0] + '/' + VIDEO_ID + '/clip/' + clip) );
		
		let recall = 0,
			overlapTime = 0; // for local recall computing
		let bestRecall = 0; // for local best recall computing
		
		let duration = Math.ceil( data['duration'] ), // length of ground true clip
			endOfClip = data['vod']['offset'] + duration; // not real video end timeline point
		for (let i = data['vod']['offset'] - (MAX_CLIP_LENGTH-1); i <= data['vod']['offset'] - MIN_CLIP_LENGTH; i++){ // (offset - 59) <= prediction <= (offset - 5)	// eg. offset = 85, duration = 10, 26~80
			if (predictedFragment[i] && (i + predictedFragment[i]['duration']) > data['vod']['offset']){ /* Simplify from (i + (predictedFragment[i]['duration']-1)) >= data['vod']['offset'] */
				let overlap;
				
				/* Simplify from the following comment part. This doesn't compute real video timeline, it only compute overlap  */
				let endOfPrediction = i + predictedFragment[i]['duration'];
					
				overlap = endOfPrediction - data['vod']['offset']; // compute overlap seconds
				
				if (endOfPrediction > endOfClip){ // predicted fragment is larger than clip
					overlap -= (endOfPrediction - endOfClip); // remove the part over than the end of ground true
					
					if ((data['vod']['offset'] - i) > (endOfPrediction - endOfClip)){
						offsetToLeft ++;
					}
					else if ((data['vod']['offset'] - i) < (endOfPrediction - endOfClip)){
						offsetToRight ++
					}
					else {
						noOffset ++;
						console.log(18);
					}
				}
				else {
					offsetToLeft ++;
				}
				/*
				let endOfPrediction = i + (predictedFragment[i]['duration']-1),
					endOfClip = data['vod']['offset'] + (duration-1);
					
				overlap = endOfPrediction - data['vod']['offset']; // compute overlap seconds
				
				if (endOfPrediction > endOfClip){
					overlap -= (endOfPrediction - endOfClip); // remove the part over than the end of ground true
				}
				
				overlap += 1; // include head and tail seconds
				*/
				
				//console.log(1+' ' + overlap);console.log(data['slug'])
				
				// precision
				predictedFragment[i]['precision'].push( overlap/predictedFragment[i]['duration'] );
				// local recall
				let singleRecallValue = overlap / duration;
				recall += singleRecallValue;
				overlapTime ++;
				// local best recall
				if (singleRecallValue > bestRecall){ // find max
					bestRecall = singleRecallValue;
				}
			}
		}
		
		for (let i = data['vod']['offset'] - MIN_CLIP_LENGTH + 1; i < data['vod']['offset']; i++){ // (offset - 4(less than MIN_CLIP_LENGTH)) <= prediction < offset	// 81~84
			if (predictedFragment[i]){ // no need to check if it overlap the ground truth period, it must be in the period
				let overlap;
				
				/* Same as above */
				let endOfPrediction = i + predictedFragment[i]['duration'];
					
				overlap = endOfPrediction - data['vod']['offset']; // compute overlap seconds
				
				if (endOfPrediction > endOfClip){ // predicted fragment is larger than clip
					overlap -= (endOfPrediction - endOfClip); // remove the part over than the end of ground true
					
					if ((data['vod']['offset'] - i) > (endOfPrediction - endOfClip)){
						offsetToLeft ++;
					}
					else if ((data['vod']['offset'] - i) < (endOfPrediction - endOfClip)){
						offsetToRight ++
					}
					else {
						noOffset ++;
						console.log(28);
					}
				}
				else {
					offsetToLeft ++;
				}
				
				//console.log(2+' ' + overlap);
				
				// precision
				predictedFragment[i]['precision'].push( overlap/predictedFragment[i]['duration'] );
				// local recall
				let singleRecallValue = overlap / duration;
				recall += singleRecallValue;
				overlapTime ++;
				// local best recall
				if (singleRecallValue > bestRecall){ // find max
					bestRecall = singleRecallValue;
				}
			}
		}
		
		for (let i = data['vod']['offset']; i < endOfClip; i++){ // offset <= prediction < (offset + duration) 	// 85~94
			if (predictedFragment[i]){ // no need to check if it overlap the ground truth period, it must be in the period
				let overlap;
				
				/* Same as above */
				let endOfPrediction = i + predictedFragment[i]['duration'];
					
				overlap = endOfClip - i; // compute overlap seconds
				
				if (endOfPrediction < endOfClip){ // predicted fragment is smaller than clip
					overlap -= endOfClip - endOfPrediction;
				}
				else {
					if (endOfPrediction == endOfClip){
						if (i == data['vod']['offset']){
							noOffset ++;
							console.log(777);
						}
					}
					else {
						offsetToRight ++;
					}
				}
				
				//console.log(3+' ' + overlap);
				
				// precision
				predictedFragment[i]['precision'].push( overlap/predictedFragment[i]['duration'] );
				// local recall
				let singleRecallValue = overlap / duration;
				recall += singleRecallValue;
				overlapTime ++;
				// local best recall
				if (singleRecallValue > bestRecall){ // find max
					bestRecall = singleRecallValue;
				}
			}
			
			if ( ! globalClip[i] ){ // globalClip[i] == 0;
				globalClip[i] = 1;
				globalClipLenght ++;
			}
		}
		
		// recall
		if (overlapTime){
			recall /= overlapTime;
		
			localRecall += recall;
			localBestRecall += bestRecall;
		}
		else {
			clipMiss ++;
		}
	}
	
	let globalOverlap = 0;
	let predictionMiss = 0; // for statistical analysis
	for (let i=0; i<videoLength; i++){ // loop whole timeline
		if (predictedFragment[i]){ // check have predicted fragment
			if (predictedFragment[i]['precision'].length){ // the fragment has overlap
				let precision = 0; // for local precision computing
				let bestPrecision = 0; // for local best precision computing
				
				for (const singlePrecisionValue of predictedFragment[i]['precision']){
					// local precision
					precision += singlePrecisionValue;
					// local best precision
					if (singlePrecisionValue > bestPrecision){ // find max
						bestPrecision = singlePrecisionValue;
					}
				} 
				precision /= predictedFragment[i]['precision'].length;
				
				localPrecision += precision;
				localBestPrecision += bestPrecision;
			}
			else { // predictionMiss
				predictionMiss ++;
			}
		}
		
		// global
		if (globalPredictedFragment[i] == 1 && globalClip[i] == 1){
			globalOverlap ++;
		}
	}
	console.log(localPrecision/(predictedFragmentCount - predictionMiss));
	console.log(localRecall/(clipList.length - clipMiss));
	localPrecision /= predictedFragmentCount;
	localRecall /= clipList.length;
	
	localBestPrecision /= predictedFragmentCount;
	localBestRecall /= clipList.length;
	
	console.log(localPrecision + ' ' + localRecall);
	console.log(localBestPrecision + ' ' + localBestRecall);
	console.log(globalOverlap/globalPredictedFragmentLength + ' ' + globalOverlap/globalClipLenght);
	console.log(predictionMiss + ' ' + clipMiss);
	console.log(offsetToLeft + ' ' + noOffset + ' ' + offsetToRight)
	
	//console.log(predictedFragment[testi]);
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