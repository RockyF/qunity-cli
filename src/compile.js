/**
 * Created by rockyl on 2020-03-18.
 */

import fs from 'fs'
import rollup from 'rollup'
import typescript from 'typescript'

const rpt = require('rollup-plugin-typescript');
const {uglify} = require('rollup-plugin-uglify');
import {dealScriptsDependencies} from "./deal-scripts-dependencies";
import chalk from "chalk/source";
import {exit} from "./tools";

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

export async function compile(options, watch = false) {
	if (!fs.existsSync('src/index.ts')) {
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
					console.log(chalk.cyan('build project successfully'));
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

			console.log(chalk.cyan('build project successfully'));
		}catch (e) {
			console.warn(e);
			exit('build project failed', 1);
		}
	}
}
