const fs = require('fs'); // FileStream
const moment = require('moment'); // Date Message

const START_DATE = moment('2019-04-02T00:00:00Z'),
	END_DATE = moment('2019-04-03T00:00:00Z');

/* Channel */
const TARGET_CHANNEL_LIST = ['ninja', 'shroud', 'tfue', 'lirik', 'summit1g', 'sodapoppin', 'timthetatman', 'loltyler1', 'drdisrespect', 'asmongold', 'dakotaz', 'nickmercs', 'tsm_daequan', 'xqcow', 'castro_1021'];

let channel_name_lists = [TARGET_CHANNEL_LIST]; // channels that we want to collect

const readingPromise = [];

function message(str, show=true){
	if (show){
		console.log(moment().format("YYYY/MM/DD kk:mm:ss A") + " | " + str);
	}
}

async function main(){
	for (const channelList of channel_name_lists){ // channel list loop
		for (const channel of channelList){ // channel loop
			let videoList = fs.readdirSync('../vod/' + channel);
			
			for (const video of videoList){
				let infoPath = '../vod/' + channel + '/' + video + '/info.json'; // the path of video info
				
				if ( ! fs.existsSync(infoPath) ){ // check file exist
					message('Info file does not exist.(' + channel + ' ' + video + ')');
					continue;
				}
				
				readingPromise.push(
					new Promise( (resolve, reject) => {
						fs.readFile(infoPath, 'utf8', (err, data) => {
							if (err) throw err;
							
							let info = JSON.parse(data);
							if (info['error']){
								resolve();
								return;
							}
							if (info['broadcast_type'] != 'archive'){
								resolve();
								return;
							}
							
							let date = moment(info['created_at']);
							if (date.isSameOrAfter(START_DATE) && date.isBefore(END_DATE)){ // date >= START_DATE && date < END_DATE
								console.log(video);
							}
							
							resolve();
						});
					})
				);
			}
		}
	}
	
	await Promise.all(readingPromise);
}

main();