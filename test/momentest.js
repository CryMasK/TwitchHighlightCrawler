const moment = require('moment'); // Date Message

const c = moment('2019-03-04T02:08:11Z')
let a = moment('2019-03-04T02:08:11Z'),
	b = moment();
console.log(a);
console.log(b.diff(a, 'days'));
console.log(moment().diff(moment('2019-03-04T02:08:11Z'), 'days'));
console.log(moment('2019-03-04T02:08:11Z').diff(moment(), 'days'));
console.log(c.diff(moment(), 'days'));