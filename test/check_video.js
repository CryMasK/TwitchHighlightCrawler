/* 呼叫的library */
const request = require('request'); // HTTP Request
const fs = require('fs'); // FileStream

let config = require('../json/Config.json'); // application setting

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
				console.log(JSON.parse(body));
				resolve(body);
			}
		});
	});
}

//getVideoInfoV5(389178879); // error example
getVideoInfoV5(330802980);