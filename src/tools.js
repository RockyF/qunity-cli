/**
 * Created by rockyl on 2018/7/5.
 */

import {spawn} from 'child_process'

export function exit(err, code = 1) {
	console.error(err);
	process.exit(code);
}

export function childProcess(cmd, params, cwd, printLog = true) {
	return new Promise((resolve, reject) => {
		let options = {};
		if (cwd) {
			options.cwd = cwd;
		}
		const proc = spawn(cmd, params, options);

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

export function gitClone(url, path) {
	return childProcess('git', ['clone', url, path]);
}

export function npmInstall(path) {
	return childProcess('npm', ['i'], path);
}

export function npmRun(path, scriptName) {
	return childProcess('npm', ['run', scriptName], path);
}
