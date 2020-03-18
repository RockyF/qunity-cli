'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var glob$1 = _interopDefault(require('glob'));
var chalk = _interopDefault(require('chalk'));
var fs$1 = _interopDefault(require('fs'));
var uuid = require('uuid');
var chokidar = _interopDefault(require('chokidar'));
var child_process = require('child_process');
var path$1 = _interopDefault(require('path'));
var serveHandler = _interopDefault(require('serve-handler'));
var http = _interopDefault(require('http'));
var https = _interopDefault(require('https'));
var rollup = _interopDefault(require('rollup'));
var typescript = _interopDefault(require('typescript'));
var chalk$1 = _interopDefault(require('chalk/source'));

/**
 * Created by rockyl on 2018/7/5.
 */

function exit(err, code = 1) {
	console.error(err);
	process.exit(code);
}

function childProcess(cmd, params, cwd, printLog = true) {
	return new Promise((resolve, reject) => {
		let options = {};
		if (cwd) {
			options.cwd = cwd;
		}
		const proc = child_process.spawn(cmd, params, options);

		if (printLog) {
			proc.stdout.on('data', (data) => {
				let txt = data.toString();
				txt = txt.substr(0, txt.length - 1);
				console.log(txt);
			});

			proc.stderr.on('data', (data) => {
				console.log(data.toString());
			});
		}

		proc.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(code);
			}
		});
	});
}

function gitClone(url, path) {
	return childProcess('git', ['clone', url, path]);
}

function npmInstall(path) {
	return childProcess('npm', ['i'], path);
}

function npmRun(path, scriptName) {
	return childProcess('npm', ['run', scriptName], path);
}

/**
 * Created by rockyl on 2020-03-16.
 */

let t;

function generateMetaFiles(watch = false) {
	if (fs$1.existsSync('assets')) {
		if (watch) {
			console.log(chalk.blue('start watch assets folder to generate meta files'));
			chokidar.watch('assets').on('all', (event, path) => {
				//console.log(event, path);
				if (t) {
					clearTimeout(t);
					t = null;
				}
				t = setTimeout(executeOnce, 200);
			});
		} else {
			executeOnce();
			console.log(chalk.cyan('generate meta files successfully'));
		}
	} else {
		exit('assets folder not exists', 1);
	}
}

function executeOnce() {
	let files = glob$1.sync('assets/**/!(*.meta)');

	for (let file of files) {
		if (!fs$1.existsSync(file + '.meta')) {
			generateMetaFile(file);
		}
	}
}

function generateMetaFile(file) {
	let meta = {
		ver: '1.0.1',
		uuid: uuid.v4(),
	};

	fs$1.writeFileSync(file + '.meta', JSON.stringify(meta, null, '\t'));

	console.log(chalk.green('generate ' + file + '.meta'));
}

/**
 * Created by rockyl on 2020-03-17.
 */

function clearMetaFiles() {
	if (fs$1.existsSync('assets')) {
		executeOnce$1();
		console.log(chalk.cyan('clear meta files successfully'));
	} else {
		exit('assets folder not exists', 1);
	}
}

function executeOnce$1() {
	let files = glob$1.sync('assets/**/*.meta');

	for (let file of files) {
		let bodyFile = file.replace('.meta', '');
		if (!fs$1.existsSync(bodyFile)) {
			fs$1.unlinkSync(file);
			console.log(chalk.green('remove ' + file + '.meta'));
		}
	}
}

/**
 * Created by rockyl on 2020-03-17.
 */

let publicPath;

function handler(request, response) {
	return serveHandler(request, response, {
		public: publicPath,
		headers: [
			{
				source: '**/*',
				headers: [
					{
						key: 'Access-Control-Allow-Origin', value: '*',
					}
				]
			}
		]
	});
}

function startHttpServe(options) {
	console.log(chalk.green('launching...'));
	return new Promise((resolve, reject) => {
		const {port, host, folder, keyFile, certFile} = options;

		publicPath = path$1.resolve(folder);
		if (fs$1.existsSync(publicPath)) {
			let sslOpts;
			if (keyFile && certFile) {
				const keyContent = fs$1.readFileSync(keyFile, 'utf8'),
					certContent = fs$1.readFileSync(certFile, 'utf8');

				if (keyContent && certContent) {
					sslOpts = {
						key: keyContent,
						cert: certContent
					};
				}
			}

			const server = sslOpts ? https.createServer(sslOpts, handler) : http.createServer(handler);

			server.on('error', (err) => {
				console.log(chalk.red(err.message));
				reject(err.message);
			});

			server.listen(port, host, function () {
				let isSSL = !!sslOpts;
				const schema = isSSL ? 'https' : 'http';

				console.log(chalk.blue(`${schema} server start at ${schema}://${host}:${port}`));
				console.log(chalk.blue(`${schema} path: ${publicPath}`));

				resolve({
					host, port, publicPath, isSSL,
				});
			});
		} else {
			console.log(chalk.red('Public path is not exist: ' + publicPath));
			reject('Public path is not exist: ' + publicPath);
		}
	})
}

/**
 * Created by rockyl on 2020-03-16.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const targetId = 'register-scripts';

function getModuleName(file) {
	//let namespace = path.relative('./', file);
	let metaContent = JSON.parse(fs.readFileSync(file + '.meta', 'utf-8'));
	let fileContent = fs.readFileSync(file, 'utf-8');
	let result = fileContent.match(/export default class (\w+)/);

	if (result) {
		return metaContent.uuid;
	}
}

function getScripts() {
	let files = glob.sync('./assets/**/*.ts');

	let scriptsImportList = [];
	let scriptsList = [];
	for (let i = 0, li = files.length; i < li; i++) {
		const file = files[i];
		let moduleName = getModuleName(file);
		if (moduleName) {
			scriptsImportList.push(`import {default as script_${i}} from "${file}";`);
			scriptsList.push(`'${moduleName}': script_${i},`);
		}
	}

	return `
${scriptsImportList.join('\n')}

export default function register(app) {
	app.registerComponentDefs({
${scriptsList.join('\n')}
	});
}
				`;
}

function dealScriptsDependencies(options) {
	return {
		name: 'deal-scripts-dependencies',

		resolveId(id) {
			if (id === targetId) {
				return id;
			}

			return null;
		},

		load(id) {
			if (id === targetId) {
				return getScripts();
			}

			return null;
		}
	}

}

/**
 * Created by rockyl on 2020-03-18.
 */

const rpt = require('rollup-plugin-typescript');
const {uglify} = require('rollup-plugin-uglify');

const defaultOptions = {
	prod: false,
	moduleName: 'qunity-game',
	externals: {
		qunity: 'qunity',
	},
};

const adaptorExternalMap = {
	pixi: {
		'pixi.js': 'PIXI',
		'qunity-pixi': 'qunity-pixi',
	}
};

const inputFile = 'src/index.ts';

async function compile(options, watch = false) {
	if (!fs$1.existsSync('src/index.ts')) {
		exit(`file [${inputFile}] not exists`, 1);
	}
	let externals = adaptorExternalMap[options.adaptor];
	if (!externals) {
		exit(`adaptor [${options.adaptor}] not exists`, 2);
	}

	if (options) {
		options = Object.assign({}, defaultOptions, options);
	} else {
		options = Object.assign({}, defaultOptions);
	}

	let {prod, moduleName} = options;

	externals = Object.assign({}, externals, defaultOptions.externals);

	let inputOptions = {
		input: inputFile,
		plugins: [
			dealScriptsDependencies(),
			rpt({
				typescript,
				include: ['src/**/*.ts+(|x)', 'assets/**/*.ts+(|x)']
			}),
		],
		external: Object.keys(externals),
	};

	if (prod) {
		inputOptions.plugins.push(uglify({}));
	}

	let outputOptions = {
		file: prod ? 'dist/bundle.min.js' : 'debug/bundle.js',
		format: 'umd',
		name: moduleName,
		sourcemap: !prod,
		globals: externals,
	};

	if (watch) {
		let watchOptions = {
			...inputOptions,
			output: outputOptions,
		};
		const watcher = rollup.watch(watchOptions);

		watcher.on('event', event => {
			switch (event.code) {
				case 'END':
					console.log(chalk$1.cyan('build project successfully'));
					break;
				case 'ERROR':
					console.warn(e);
					break;
			}
			// event.code 会是下面其中一个：
			//   START        — 监听器正在启动（重启）
			//   BUNDLE_START — 构建单个文件束
			//   BUNDLE_END   — 完成文件束构建
			//   END          — 完成所有文件束构建
			//   ERROR        — 构建时遇到错误
			//   FATAL        — 遇到无可修复的错误
		});
	} else {
		try {
			const bundle = await rollup.rollup(inputOptions);
			await bundle.write(outputOptions);

			console.log(chalk$1.cyan('build project successfully'));
		}catch (e) {
			console.warn(e);
			exit('build project failed', 1);
		}
	}
}

exports.childProcess = childProcess;
exports.clearMetaFiles = clearMetaFiles;
exports.compile = compile;
exports.exit = exit;
exports.generateMetaFile = generateMetaFile;
exports.generateMetaFiles = generateMetaFiles;
exports.gitClone = gitClone;
exports.npmInstall = npmInstall;
exports.npmRun = npmRun;
exports.startHttpServe = startHttpServe;
//# sourceMappingURL=index.js.map