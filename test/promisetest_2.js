function delay(ms){
	console.log(ms);
	return new Promise(function(resolve, reject){
		setTimeout(()=>{
			resolve(ms);
		}, ms);
	});
}

async function main(){
	const p = [];
	
	console.log(70);
	p.push(delay(3000));
	console.log(75);
	p.push(delay(10000));
	await Promise.all(p)
		.then((result) => {
			console.log(result);
		});
	console.log(80);
	p.push(delay(10000));
	console.log(85);
	p.push(delay(5000));
	await Promise.all(p).then((result) => {
			console.log(result);
		});
	console.log(100);
}

main();