function delay(ms, id){
	return new Promise(function(resolve, reject){
		setTimeout(()=>{
			console.log(id);
			resolve();
		}, ms);
	});
}


/*async function kk(){	ERROR
	const crawlChatPromise = [];
	
	crawlChatPromise.push(
		new Promise( async (resolve, reject) => {
			await delay(3000);
			console.log(87)
		})
	);
	crawlChatPromise.push(
		new Promise( async (resolve, reject) => {
			await delay(5000);
			console.log(99)
		})
	);
	
	crawlChatPromise.push(
		new Promise( async (resolve, reject) => {
			await delay(1000);
			console.log(86)
		})
	);
	
	return new Promise( async function(resolve,reject){
		await Promise.all(crawlChatPromise);
		console.log(100)
		resolve();
	});
}*/

async function kk(){
	const crawlChatPromise = [];
	
	crawlChatPromise.push(
		delay(3000, 87) 
	);
	crawlChatPromise.push(
		delay(5000, 99) 
	);
	
	crawlChatPromise.push(
		delay(1000, 86) 
	);
	
	return new Promise( async (resolve,reject) => {
		await Promise.all(crawlChatPromise);
		await delay(3000, 666666)
		console.log(100)
		resolve();
	});
}

async function main(){
	await kk();
	console.log(101)
}

main();