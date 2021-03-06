/* 呼叫的library */
const request = require('request'); // HTTP Request
const fs = require('fs'); // FileStream
const moment = require('moment'); // Date Message

let config = require('./json/Config.json'); // application setting

/* Channel */
const TARGET_CHANNEL_LIST = ['ninja', 'shroud', 'tfue', 'lirik', 'summit1g', 'sodapoppin', 'timthetatman', 'loltyler1', 'drdisrespect', 'asmongold', 'dakotaz', 'nickmercs', 'tsm_daequan', 'xqcow', 'castro_1021'];
const COMPETITION_CHANNEL_LIST = ['overwatchleague', 'riotgames', 'rocketleague', 'esl_csgo', 'playhearthstone', 'easportsfifa', 'fortnite', 'warcraft', 'callofduty', 'esl_dota2'];
const CANDIDATE_CHANNEL_LIST = ['yassuo', 'mongraal', 'pokimane', 'nl_kripp', 'moonmoon_ow', 'dizzy', 'thijs', 'tsm_hamlinz', 'maximilian_dood', 'nightblue3', 'imaqtpie', 'drlupo', 'forsen'];
const SPECIAL_CHANNEL_LIST = ['magic', 'oldschoolrs', 'criticalrole', 'twitch', 'rajjpatel'];

let channel_name_lists = [TARGET_CHANNEL_LIST], // channels that we want to collect /*, COMPETITION_CHANNEL_LIST, CANDIDATE_CHANNEL_LIST, SPECIAL_CHANNEL_LIST 2019-04-05T01:00:00.000Z*/
	channel_id_list = require('./json/Channel_ID.json'); // get user id by user login name

/* Recording date period */
let started_date = moment(config['recorded_date']),
	ended_date = started_date.clone();
ended_date.add(config.period, config.period_key); // one period after started day

const writingPromise = [];

function message(str, show=true){
	if (show){
		console.log(moment().format("YYYY/MM/DD kk:mm:ss A") + " | " + str);
	}
}

function log(code, message, show=true){
	/* 
		00: The original video of specified clip can not be access.
		01: In crawlAllChatMessage(), target video is not in 'recorded' status.
		02: In crawlAllChatMessage(), target video has been deleted (404 error message).
	*/
	if (show){
		fs.appendFileSync('./event_log.txt', moment().format("YYYY/MM/DD kk:mm:ss A") + " | Error " + code.toString().padStart(config.ErrorCodeLength, "0") + ": " + message + "\n", "UTF-8");
	}
}

function delay(ms){
	return new Promise(function(resolve, reject){
		setTimeout(resolve, ms);
	});
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

function getTwitchAuthentication(){
	let queryString = {
		client_id: config['client_id'],
		client_secret: config['client_secret'],
		grant_type: 'client_credentials'
		//scope:
	}
	
	return new Promise(function (resolve, reject){
		request({
		url: 'https://id.twitch.tv/oauth2/token',
		qs: queryString,
		method: "POST"
		}, function(error, res, body){
			let data = JSON.parse(body);
			
			console.log(data);
		});
	});
}

function revokeTwitchAuthentication(token){
	if (! token){
		return;
	}
	
	let queryString = {
		client_id: config['client_id'],
		token: token	
	}
	
	return new Promise(function (resolve, reject){
		request({
		url: 'https://id.twitch.tv/oauth2/revoke',
		qs: queryString,
		method: "POST"
		}, function(error, res, body){
			if (res.statusCode == 200){
				resolve();
			}
			else {
				console.log(res.statusCode + ' | ' + error + '\n'); // message
				reject();
			}
		});
	});
}

function getSpecifiedClipInfoV5(slug){
	return new Promise(function (resolve, reject){
		request({
		url: 'https://api.twitch.tv/kraken/clips/' + slug,
		headers:{
			Accept: 'application/vnd.twitchtv.v5+json',
			//'Client-ID': config['client_id'],
			Authorization: 'OAuth ' +  config['authorization_token']
			},
		method: "GET"
		}, function(error, res, body){
			let a = JSON.parse(body);
			console.log(a);
			//console.log(a['clips'].length);
			//console.log(a['_cursor']);
			
			resolve();
		});
	});
}

function getSpecifiedClipInfo(id){
	return new Promise(function (resolve, reject){
		request({
		url: 'https://api.twitch.tv/helix/clips?id=' + id,
		headers:{
			//'Client-ID': config['client_id']
			Authorization: 'Bearer ' + config['authorization_token']
			},
		method: "GET"
		}, function(error, res, body){
			let a = JSON.parse(body);
			console.log(a);
			
			resolve();
		});
	});
}

function crawlSpecifiedClipInfoV5(slug, retry = 0){
	return new Promise(function (resolve, reject){
		request({
		url: 'https://api.twitch.tv/kraken/clips/' + slug,
		headers:{
			Accept: 'application/vnd.twitchtv.v5+json',
			//'Client-ID': config['client_id'],
			Authorization: 'OAuth ' +  config['authorization_token']
			},
		method: "GET"
		}, async function(error, res, body){
			if (error || ! body || res.statusCode != 200){ // unexpected error
				if (retry < config.max_retry){ // retry (now set 5 times)
					retry ++; // try again
					
					if (config.debug_mode){ // debug option
						console.log('Get specified clip info failed, retry ' + (5000 * retry) + ' seconds later...( Status Code: '+ res.statusCode + ' - ' + slug + ' )');
					}
					await delay(5000 * retry); // wait 5* seconds and retry
					
					try {
						if (config.debug_mode){ // debug option
							console.log('now retry ' + retry + ' times.( ' + slug + ' )');
						}
						
						await crawlSpecifiedClipInfoV5(slug, retry);
						resolve();
					}
					catch(rejectMessage) {
						if (config.debug_mode){ // debug option
							console.log(rejectMessage);
						}
						reject(rejectMessage);
					}
				}
				else {
					if (config.debug_mode){ // debug option
						console.log(error);
					}
					reject('Retry limit reached (' + crawlSpecifiedClipInfoV5.name + ' - ' + slug + ').');
				}
			}
			else {
				let clipInfo = JSON.parse(body);
			
				if (clipInfo['vod']){ // check vod still can be access	/* if can't get source video info, this field will return null value */
					let dir = './vod/' + clipInfo['broadcaster']['name'] + '/' + clipInfo['vod']['id'] + '/clip';
				
					writingPromise.push( 
						new Promise( (resolve, reject) => {
							if ( ! fs.existsSync(dir) ){ // check directory is exist
								fs.mkdirSync( dir, {recursive: true} );
							}
							
							fs.writeFile(dir + '/' + clipInfo['slug'] + '.json', body, (err) => {
								if (err) throw err;
								resolve();
							});
						})
					);
				}
				else { // no source video info
					log(0, "Can't find the broadcast video of clip: " + clipInfo['slug']);
				}
				
				resolve();
			}
		});
	});
}

function getClipInfo(channel, start, end, cursor){ /* 一樣最大只能查到第1100個clip（1000以後的cursor都是undefined） */
	let queryString = {
		broadcaster_id: channel_id_list[channel], // change channel name to id
		started_at: '2019-04-01T00:00:00.000Z', /* 同時間(minute)的Clip會被抓下（等同於 >= YYYY-MM-DDTHH:mm:ss+8:00） */	/* it also can access '2019-04-18T00:00:00+08:00' */
		ended_at: '2019-04-01T00:30:00.000Z', /* 該時間(minute)點以前的Clip會被抓取（等同於 < YYYY-MM-DDTHH:mm:ss+8:00） */
		first: 100
	};
	if (start){
		queryString['started_at'] = start;
		if (end){
			queryString['ended_at'] = end;
		}
	}
	if (cursor){
		queryString['after'] = cursor;
	}
	
	return new Promise(function (resolve, reject){
		request({
		url: 'https://api.twitch.tv/helix/clips',
		qs: queryString,
		headers:{
			//'Client-ID': config['client_id']
			Authorization: 'Bearer ' + config['authorization_token']
			},
		method: "GET"
		}, async function(error, res, body){
			if (error || ! body || res.statusCode != 200){ // unexpected error
				reject();
			}
			else{
				let data = JSON.parse(body);
				
				console.log(data);
				console.log(data['data'].length);
				
				resolve(data['pagination']['cursor']); // it will undefined when it end
			}
		});
	});
}

function crawlClipInfo(channel, start, end, cursor, retry = 0){ /* 一樣最大只能查到第1100個clip（1000以後的cursor都是undefined） */
	let queryString = {
		broadcaster_id: channel_id_list[channel], // change channel name to id
		//started_at: '2019-03-05T19:09:00.000Z', /* 同時間(minute)的Clip會被抓下（等同於 >= YYYY-MM-DDTHH:mm:ss+8:00） */	/* it also can access '2019-04-18T00:00:00+08:00' */
		//ended_at: '2019-03-06T00:00:00.000Z', /* 該時間(minute)點以前的Clip會被抓取（等同於 < YYYY-MM-DDTHH:mm:ss+8:00） */
		first: 100
	};
	if (start){
		queryString['started_at'] = start;
		if (end){
			queryString['ended_at'] = end;
		}
	}
	if (cursor){
		queryString['after'] = cursor;
	}
	
	return new Promise(function (resolve, reject){
		request({
		url: 'https://api.twitch.tv/helix/clips',
		qs: queryString,
		headers:{
			//'Client-ID': config['client_id']
			Authorization: 'Bearer ' + config['authorization_token']
			},
		method: "GET"
		}, async function(error, res, body){
			if (error || ! body || res.statusCode != 200){ // unexpected error
				if (retry < config.max_retry){ // retry (now set 5 times)
					retry ++; // try again
					
					if (config.debug_mode){ // debug option
						console.log('Get specified channel clip failed, retry ' + (5000 * retry) + ' seconds later...( Status Code: '+ res.statusCode + ' - ' + channel + ' | Start at: ' + start + ')');
					}
					await delay(5000 * retry); // wait 5* seconds and retry
					
					try {
						if (config.debug_mode){ // debug option
							console.log('now retry ' + retry + ' times.( ' + channel + ' | Start at: ' + start + ' )');
						}
						
						let report = await crawlClipInfo(channel, start, end, cursor, retry);
						resolve(report);
					}
					catch(rejectMessage) {
						if (config.debug_mode){ // debug option
							console.log(rejectMessage);
						}
						reject(rejectMessage);
					}
				}
				else {
					if (config.debug_mode){ // debug option
						console.log(error);
					}
					reject('Retry limit reached (' + crawlClipInfo.name + ' - ' + channel + ' | Start at: ' + start + ').');
				}
			}
			else{
				let data = JSON.parse(body);
				
				//console.log(data);
				//console.log(data['data'].length);
				//console.log(data['data'].length);
				
				const crawlClipInfoPromise = []; // store promise of crawl clip info action
				for (const clipInfo of data['data']){
					if (clipInfo['video_id']){ /* if can't get source video info, this field will return empty string */
						crawlClipInfoPromise.push( crawlSpecifiedClipInfoV5(clipInfo['id']) );
					}
					else {
						log(0, "Can't find the broadcast video of clip: " + clipInfo['id']);
					}
				}
				
				await Promise.all(crawlClipInfoPromise);
				await Promise.all(writingPromise); // make sure all info are stored
				
				resolve({
					cursor: data['pagination']['cursor'], // cursor will undefined when it end
					length: data['data'].length // data length
				});
			}
		});
	});
}

function checkAllVideoInfo(channelName){	
	return new Promise(async function (resolve, reject){
		let videoList = fs.readdirSync('./vod/' + channelName);
		let counter = 0;
		const crawlAllMessagePromise = [];
		
		for (const videoID of videoList){
			let infoPath = './vod/' + channelName + '/' + videoID + '/info.json'; // the path of video info
			
			if ( fs.existsSync(infoPath) ){ // already crawl the info
				continue;
			}
			else {
				counter ++;
				crawlAllMessagePromise.push( crawlAllChatMessage(channelName, videoID) ); // crawl
			}
			
			if (counter >= 5){ // running task is more than 5
				counter = 0; // reset
				
				// wait all phased task complete
				await Promise.all(crawlAllMessagePromise);
				await Promise.all(writingPromise);
			}
		}
		
		// wait all task complete
		await Promise.all(crawlAllMessagePromise);
		await Promise.all(writingPromise);
		
		resolve();
	});
}

function getVideoInfoV5(id, retry = 0){
	return new Promise(function (resolve, reject){
		request({
		url: 'https://api.twitch.tv/kraken/videos/' + id,
		headers:{
			Accept: 'application/vnd.twitchtv.v5+json',
			'Client-ID': config['client_id'],
			Authorization: 'Bearer ' +  config['authorization_token'] /* I don't know why use bearer token */	/* 無法使用授權 { error: 'Unauthorized',  status: 401,  message: 'invalid oauth token' } */
			},
		method: "GET"
		}, async function(error, res, body){
			if (error || ! body || (res.statusCode != 200 && res.statusCode != 404)){ // unexpected error
				if (retry < config.max_retry){ // retry (now set 5 times)
					retry ++; // try again
					
					if (config.debug_mode){ // debug option
						console.log('Get specified video info (Twitch API V5) failed, retry ' + (5000 * retry) + ' seconds later...( Status Code: '+ res.statusCode + ' - ' + id + ' )');
					}
					await delay(5000 * retry); // wait 5* seconds and retry
					
					try {
						if (config.debug_mode){ // debug option
							console.log('now retry ' + retry + ' times.( ' + id + ' )');
						}
						
						let data = await getVideoInfoV5(id, retry);
						resolve(data);
					}
					catch(rejectMessage) {
						if (config.debug_mode){ // debug option
							console.log(rejectMessage);
						}
						reject(rejectMessage);
					}
				}
				else { // up to retry limit
					if (config.debug_mode){ // debug option
						console.log(error);
					}
					reject('Retry limit reached (' + getVideoInfoV5.name + ' - ' + id + ').');
				}
			}
			else { // normal case or target video has been deleted (statusCode == 404 and return error message)
				//console.log(JSON.parse(body));
				resolve(body);
			}
		});
	});
}

function getVideoInfo(id, retry = 0){
	let queryString = {
		id: id /* it can be multiple value */
	};
	
	return new Promise(function (resolve, reject){
		request({
		url: 'https://api.twitch.tv/helix/videos',
		qs: queryString,
		headers:{
			//'Client-ID': config['client_id']
			Authorization: 'Bearer ' +  config['authorization_token']
			},
		method: "GET"
		}, async function(error, res, body){
			if (error || ! body || res.statusCode != 200){ // unexpected error
				if (retry < config.max_retry){ // retry (now set 5 times)
					retry ++; // try again
					
					if (config.debug_mode){ // debug option
						console.log('Get specified video info failed, retry ' + (5000 * retry) + ' seconds later...( Status Code: '+ res.statusCode + ' - ' + id + ' )');
					}
					await delay(5000 * retry); // wait 5* seconds and retry
					
					try {
						if (config.debug_mode){ // debug option
							console.log('now retry ' + retry + ' times.( ' + id + ' )');
						}
						
						let data = await getVideoInfo(id, retry);
						resolve(data);
					}
					catch(rejectMessage) {
						if (config.debug_mode){ // debug option
							console.log(rejectMessage);
						}
						reject(rejectMessage);
					}
				}
				else {
					if (config.debug_mode){ // debug option
						console.log(error);
					}
					reject('Retry limit reached (' + getVideoInfo.name + ' - ' + id + ').');
				}
			}
			else {
				//console.log(JSON.parse(body));
				resolve(body);
			}
		});
	});
}

function getChatMessage(id, cursor, retry = 0){
	return new Promise(function (resolve, reject){
		request({
		url: 'https://api.twitch.tv/v5/videos/' + id + '/comments?' + ((cursor) ? 'cursor=' + cursor : 'content_offset_seconds=0'),
		headers:{
			Accept: 'application/vnd.twitchtv.v5+json',
			'Client-ID': config['client_id']
			//Authorization: 'OAuth ' +  config['authorization_token'] /* 無法使用授權 { error: 'Unauthorized',  status: 401,  message: 'invalid oauth token' } */
			},
		method: "GET"
		}, async function(error, res, body){
			if (error || ! body || res.statusCode != 200){ // unexpected error
				if (retry < config.max_retry){ // retry (now set 5 times)
					retry ++; // try again
					
					if (config.debug_mode){ // debug option
						console.log('Get specified chat message fragment failed, retry ' + (5000 * retry) + ' seconds later...( Status Code: '+ res.statusCode + ' - ' + id + ((cursor) ? ' ' + cursor : '') + ' )');
					}
					await delay(5000 * retry); // wait 5* seconds and retry
					
					try {
						if (config.debug_mode){ // debug option
							console.log('now retry ' + retry + ' times.( ' + id + ((cursor) ? ' ' + cursor : '') + ' )');
						}
						
						let data = await getChatMessage(id, cursor, retry);
						resolve(data);
					}
					catch(rejectMessage) {
						if (config.debug_mode){ // debug option
							console.log(rejectMessage);
						}
						reject(rejectMessage);
					}
				}
				else {
					if (config.debug_mode){ // debug option
						console.log(error);
					}
					reject('Retry limit reached (' + getChatMessage.name + ' - ' + id + ((cursor) ? ' ' + cursor : '') + ').');
				}
			}
			else {
				/* the field 'source' will be different when message is published in live broadcast(value 'chat') or after live(published in vod video, value 'comment') */
				/* message be published in vod will publish in integer second */
				
				/*let data = JSON.parse(body)
				for (const comment of data['comments']){
					console.log(comment);
				}*/
				
				resolve(body); // raw data
			}
		});
	});
}

async function crawlAllChatMessage(channel, videoID){
	message('Crawling video ' + videoID + ' chat message.');
	let rawVideoData = await getVideoInfoV5(videoID),
		videoInfo = JSON.parse(rawVideoData);
	
	if (videoInfo['status'] == 404){
		log(2, "Target video has been deleted ( " + channel + ': ' + videoID + ' )');
		syncWriteData('./vod/' + channel + '/' + videoID + '/info.json', rawVideoData); // let info.json as a mark for completing this task
		message('Target video has been deleted (' + videoID + ').');
		
		return new Promise((resolve,reject) => {		
			resolve();
		});
	}
	else if (videoInfo['status'] === 'recorded'){
		const crawlChatPromise = [];

		let cursor;
		let message_id = 1;
		do {
			let rawData = await getChatMessage(videoID, cursor);
			let data = JSON.parse(rawData);
			//console.log(videoID + ' - ' + message_id);
			cursor = data['_next'];
			
			crawlChatPromise.push(
				new Promise( (resolve, reject) => {
					fs.writeFile('./vod/' + channel + '/' + videoID + '/Message-' + message_id + '.json', rawData, (err) => {
						if (err) throw err;
						resolve();
					});
				})
			);
			
			message_id ++;
		} while (cursor);
		
		return new Promise( async (resolve,reject) => {
			await Promise.all(crawlChatPromise);
			syncWriteData('./vod/' + channel + '/' + videoID + '/info.json', rawVideoData); // let info.json as a mark for completing this task
			message('Complete to crawl chat room message of video ' + videoID + '.');
			
			resolve();
		});
	}
	else {
		log(1, "Target video is not in 'recorded' status ( " + channel + ': ' + videoID + ' - ' + videoInfo['status'] + ' )');
		message('Target video ' + videoID + " is not in 'recorded' status, check log message (" +  videoInfo['status'] + ').');
		
		return new Promise((resolve,reject) => {		
			resolve();
		});
	}
}

function getUserInfo(channelName){ // get specific twitch user info
	let queryString = {
		login: channelName /* it can be multiple value */
	};
	
	return new Promise(function (resolve, reject){
		request({
		url: 'https://api.twitch.tv/helix/users',
		qs: queryString,
		headers:{
			//'Client-ID': config['client_id'],
			Authorization: 'Bearer ' + config['authorization_token']
			},
		method: "GET"
		}, function(error, res, body){
			let data = JSON.parse(body);
			
			resolve(data);
		});
	});
}

async function main(){
	//console.log(await getUserInfo('asiagodtonegg3be0'));
	
	/* Check all listed channels can be found its channel id */
	for (const channelList of channel_name_lists){
		for (const channelName of channelList){
			if (! channel_id_list[channelName]){ // if a new channel
				let data = await getUserInfo(channelName); /* it can be sync (multiple parameter) */
				channel_id_list[channelName] = data['data'][0]['id'];
			}
		}
	}
	
	syncWriteData('./json/Channel_ID.json', JSON.stringify(channel_id_list)); // store
	
	/* Crawl clip info */
	while ( moment().diff(started_date, 'days') >= 7 ){ // only crawl data for more than 7 days	// WARNING!! it is inaccurate, moment.utc() use local compute time
		// move to next period
		console.log('==== Go to next period ===='); // message
		started_date.add(config.period, config.period_key);
		ended_date.add(config.period, config.period_key);
		
		for (const channelList of channel_name_lists){ // loop all list
			console.log('Now changing to another channel list.'); // message
			for (const channelName of channelList){ // loop all channel in the specific list
				message('Crawling ' + started_date.toISOString() + ' clip: ' + channelName);
				
				let cursor;
				
				do {
					let report = await crawlClipInfo(channelName, started_date.toISOString(), ended_date.toISOString(), cursor);
					cursor = report.cursor;
					
					let cooldown = (1 + 11 * (report.length / 100)); // seconds
					console.log('Wait ' + cooldown + ' seconds (' + report.length + ' data).'); // message
					await delay(cooldown * 1000); // cool down
				} while (cursor);
			}
		}
		
		config.recorded_date = started_date.toISOString(); // update recorded date
		fs.writeFileSync('./json/Config.json', JSON.stringify(config)); // update config
	}
	
	/* Crawl chat room message */
	for (const channelList of channel_name_lists){ // loop all list
		console.log('Now changing to another channel list.'); // message
		for (const channelName of channelList){ // loop all channel in the specific list
			message('Checking video info: ' + channelName);
			await checkAllVideoInfo(channelName);
		}
	}
	
	//await getClipInfo('xqcow', undefined, undefined, 'eyJiIjpudWxsLCJhIjp7IkN1cnNvciI6Ik1UQXcifX0');
	//await getSpecifiedClipInfo('EnticingWanderingRaccoonDancingBaby');
	//await getTwitchAuthentication();
	//await revokeTwitchAuthentication('4fc714jcww4oi9yjockjy1l32ftf66');
	//await getSpecifiedClipInfoV5('CaringColdHamsterRalpherZ');
	//await getChatMessage('406035831');
	//await getVideoInfo('415749436');
	//await getVideoInfoV5('389178879');
	//await crawlAllChatMessage('xqcow', '406035831');
	
	await Promise.all(writingPromise);
}

main();