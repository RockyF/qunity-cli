/**
 * Created by rockyl on 2020-03-16.
 */

import glob from 'glob'
import chalk from 'chalk'
import fs from 'fs'
import {v4 as generateUUID} from "uuid"
import chokidar from 'chokidar'
import {exit} from "../tools";

let t;

export function generateMetaFiles(watch = false) {
	if (fs.existsSync('assets')) {
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
	let files = glob.sync('assets/**/!(*.meta)');

	for (let file of files) {
		if (!fs.existsSync(file + '.meta')) {
			generateMetaFile(file);
		}
	}
}

export function generateMetaFile(file) {
	let meta = {
		ver: '1.0.1',
		uuid: generateUUID(),
	};

	fs.writeFileSync(file + '.meta', JSON.stringify(meta, null, '\t'));

	console.log(chalk.green('generate ' + file + '.meta'));
}
