/**
 * Created by rockyl on 2020-03-17.
 */

const {exit, childProcess} = require("../dist");

const subCommands = [
	'meta',
	'compile',
	'serve',
];

(async function () {
	let args = process.argv.slice(2);
	args.push('-w');
	let cwd = process.cwd();
	let ps = subCommands.map(cmd => {
		console.log('start sub command: ' + cmd);
		return childProcess('node', [__dirname + '/qunity-' + cmd + '.js', ...args], cwd);
	});
	await Promise.all(ps);
})().catch(e => {
	exit(e);
});
