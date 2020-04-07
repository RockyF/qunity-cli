/**
 * Created by rockyl on 2020-03-18.
 */

import fs from 'fs'
import path from 'path'
import rollup from 'rollup'
import typescript from 'typescript'
import rpt from 'rollup-plugin-typescript';
import {uglify} from 'rollup-plugin-uglify';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import {dealScriptsDependencies} from "./deal-scripts-dependencies";
import chalk from "chalk/source";
import {exit} from "./tools";
import chokidar from "chokidar";

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
let t;

export async function compile(options, watch = false) {
	if (!fs.existsSync('src/index.ts')) {
		exit(`file [${inputFile}] not exists`, 1);
	}
	let externals = adaptorExternalMap[options.adaptor];
	let manifestExternals = {};

	if(fs.existsSync('manifest.json')){
		let manifest = JSON.parse(fs.readFileSync('manifest.json'));
		manifestExternals = manifest.externals;
	}
	if (!externals) {
		exit(`adaptor [${options.adaptor}] not exists`, 2);
	}

	if (options) {
		options = Object.assign({}, defaultOptions, options);
	} else {
		options = Object.assign({}, defaultOptions);
	}

	let {prod, moduleName} = options;

	externals = Object.assign({}, externals, defaultOptions.externals, manifestExternals);

	let inputOptions = {
		input: inputFile,
		plugins: [
			json(),
			dealScriptsDependencies(),
			resolve({
				browser: true,
			}),
			rpt({
				typescript,
				include: ['src/**/*.ts+(|x)', 'assets/**/*.ts+(|x)']
			}),
			commonjs(),
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
				case 'START':
					console.log(chalk.cyan('start building...'));
					break;
				case 'END':
					console.log(chalk.cyan('build project successfully'));
					break;
				case 'ERROR':
					console.warn(event);
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

		chokidar.watch('assets',{
			//ignored: /^.+(?<!\.ts)$/,
			ignoreInitial: true,
		}).on('all', (event, path) => {
			if(event === 'add' && path.endsWith('.ts')){
				//console.log(event, path);
				if (t) {
					clearTimeout(t);
					t = null;
				}
				t = setTimeout(modifyNeedCompile, 500);
			}
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

function modifyNeedCompile(){
	let content = fs.readFileSync('src/need-compile.ts');
	fs.writeFileSync('src/need-compile.ts', content);
}
