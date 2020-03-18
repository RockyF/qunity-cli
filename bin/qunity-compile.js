/**
 * Created by rockyl on 2020-03-17.
 */

const program = require('commander');
const {compile, exit} = require("../dist");

program
	.option('-m, --moduleName [string]', 'a module name for global', 'qunity-game')
	.requiredOption('-a, --adaptor [string]', 'adaptor for qunity (pixi,egret)')
	.option('-w, --watch', 'watch filesystem', false)
	.option('--prod', 'production mode', false)
	.allowUnknownOption(true)
	.parse(process.argv);

(async function () {
	compile({
		adaptor: program.adaptor,
		moduleName: program.moduleName,
		prod: program.prod,
	}, program.watch);
})().catch(e => {
	exit(e);
});
