const moment = require('moment'); // Date Message

/**/const c = moment('2019-03-04T02:08:11Z')
let a = moment('2019-03-04T02:08:11Z'),
	b = moment();
console.log(a);
console.log(b.diff(a, 'days'));
console.log(moment().diff(moment('2019-03-04T02:08:11Z'), 'days'));
console.log(moment('2019-03-04T02:08:11Z').diff(moment(), 'days'));
console.log(c.diff(moment(), 'days'));

//console.log(moment('2019-07-09T06:08:11Z').diff(moment('2019-07-02T06:00:00.000Z'), 'days')); // 7
console.log(moment().diff(moment('2019-07-20T13:00:00.000Z'), 'days'));

//let a = moment('2019-03-04T00:00:00Z')
//console.log(a.add(1, 'days').toISOString()); // 2019-03-05T00:00:00.000Z
//console.log(a.toISOString()); // 2019-03-05T00:00:00.000Z

/*function gg(ma, mb){
	console.log(ma.toISOString());
	console.log(mb.toISOString());
}

gg(a, a.add(1, 'days')); // 2019-03-05T00:00:00.000Z	2019-03-05T00:00:00.000Z*/

/*function gg(ma){
	ma.add(1, 'days')
}

gg(a);
console.log(a.toISOString()); // 2019-03-05T00:00:00.000Z*/

/*let b = a;
a.add(1, 'days');
console.log(b.toISOString()); // 2019-03-05T00:00:00.000Z*/

/*let b = a.clone();
a.add(1, 'days');
console.log(b.toISOString()); // 2019-03-04T00:00:00.000Z

let c = moment('2019-05-12T16:32:00Z')
console.log(c.isBefore(moment.utc()));
console.log(c.format('YYYY-MM-DD'));
console.log(c.toISOString());*/