import * as Os from "node:os";
import * as Path from "node:path";
import * as Crypto from "node:crypto";
import * as Fs from "node:fs/promises";
import { exists } from "@std/fs";
import { Err, Ok, type Result } from "./funcs.ts";
import process from "node:process";
import { DenzaiErr } from "./error.ts";

export class UnsupportedOS extends Error {}

export function isosec(date?: Date) {
	return (date ?? new Date()).toISOString();
}

export function userHomeDir() {
	return Os.homedir();
}

export function userConfigDir(): Result<string, Error> {
	const currentOs = Os.platform();
	if (currentOs === "darwin") {
		if (process.env.XDG_CONFIG_HOME) {
			return Ok(process.env.XDG_CONFIG_HOME);
		}
		return Ok(Path.join(userHomeDir(), "Library", "Application Support"));
	}

	if (
		currentOs === "linux" || currentOs === "freebsd" ||
		currentOs === "openbsd"
	) {
		if (process.env.XDG_CONFIG_HOME) {
			return Ok(process.env.XDG_CONFIG_HOME);
		}
		return Ok(Path.join(userHomeDir(), ".config"));
	}
	if (currentOs === "win32") {
		if (process.env.AppData) {
			return Ok(process.env.AppData);
		}
		return Err(new Error(`%AppData% not set`));
	}
	return Err(new UnsupportedOS(currentOs));
}

export function userCacheDir(): Result<string, Error> {
	const os = Os.platform();
	if (os === "darwin") {
		return Ok(Path.join(userHomeDir(), "Library", "Caches"));
	}
	if (os === "linux" || os === "freebsd" || os === "openbsd") {
		if (process.env.XDG_CONFIG_HOME) {
			return Ok(process.env.XDG_CONFIG_HOME);
		}
		return Ok(Path.join(userHomeDir(), ".config"));
	}
	if (os === "win32") {
		if (process.env.AppData) {
			return Ok(process.env.AppData);
		}
		return Err(new Error(`%AppData% not set`));
	}
	return Err(new UnsupportedOS(os));
}

export function userStateDir(): Result<string, Error> {
	const os = Os.platform();
	if (os === "darwin") {
		if (process.env.XDG_CONFIG_HOME) {
			return Ok(process.env.XDG_CONFIG_HOME);
		}
		return Ok(Path.join(userHomeDir(), "Library", "Application Support"));
	}

	if (os === "linux" || os === "freebsd" || os === "openbsd") {
		if (process.env.XDG_CONFIG_HOME) {
			return Ok(process.env.XDG_CONFIG_HOME);
		}
		return Ok(Path.join(userHomeDir(), ".config"));
	}
	if (os === "win32") {
		if (process.env.AppData) {
			return Ok(process.env.AppData);
		}
		return Err(new Error(`%AppData% not set`));
	}
	return Err(new UnsupportedOS(os));
}

export async function userEditor(): Promise<string | null> {
	const visual = process.env.VISUAL;
	const editor = process.env.EDITOR;
	for (
		const ed of [
			visual,
			editor,
			"code",
			"nvim",
			"vim",
			"vi",
			"nvi",
			"emacs",
			"nano",
		]
	) {
		if (ed === undefined || ed?.length <= 0) {
			continue;
		}
		if (await whereis(ed)) {
			return ed;
		}
	}
	return null;
}

export async function whereis(exe: string): Promise<string | null> {
	const envPath = process.env.PATH ?? "";
	const envExt = process.env.PATHEXT ?? "";
	const dirs = envPath
		.replace(/["]+/g, "")
		.split(Path.delimiter)
		.filter((a) => a.length > 0);
	const extensions = envExt.split(";");
	const p = [];
	for (const dir of dirs) {
		for (const ext of extensions) {
			const file = Path.join(dir, `${exe}${ext}`);
			p.push(
				Fs.stat(file).then((stats) => {
					try {
						if (stats.isFile()) {
							return file;
						}
					} catch (_) {
						throw new Error("Not a file");
					}
				}),
			);
		}
	}
	const res = await Promise.any(p);
	return res ?? null;
}

export async function readFile(
	filename: string,
): Promise<Result<string, DenzaiErr>> {
	const path = new URL(filename, import.meta.url);
	try {
		return Ok(await Fs.readFile(path, { encoding: "utf8" }));
	} catch (error) {
		return Err(
			new DenzaiErr({
				code: "FILE_NOT_FOUND",
				context: { filename, path, error },
			}),
		);
	}
}

export async function fileChecksum(
	filename: string,
): Promise<Result<string, DenzaiErr>> {
	const path = new URL(filename, import.meta.url);
	console.log({ path });
	try {
		const data = await Fs.readFile(path, { encoding: "utf8" });
		const hash = contentHash(data);
		return Ok(hash);
	} catch (error) {
		return Err(
			new DenzaiErr({
				code: "FILE_NOT_FOUND",
				context: { filename, path, error },
			}),
		);
	}
}

export function contentHash(content: string): string {
	return Crypto.createHash("sha256").update(content).digest("hex");
}

export async function doEdit(file: string): Promise<Result<string, DenzaiErr>> {
	const editor = await userEditor();
	if (editor === null) {
		return Err(new DenzaiErr({ code: "EXE_NOT_FOUND" }));
	}
	const cmd = new Deno.Command(editor, {
		args: [file],
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});
	const p = cmd.spawn();

	// Wait for the editor to exit
	await p.status;
	return await readFile(file);
}

export async function findTarget(options: {
	root: string;
	target: string;
}): Promise<string | null> {
	const { root, target } = options;
	const queue: string[] = [root];
	while (queue.length > 0) {
		const cur = queue.shift();
		DenzaiErr.invariant(cur !== undefined);
		for await (const { name, isDirectory } of Deno.readDir(cur)) {
			if (isDirectory && name === "node_modules") {
				continue;
			}
			const node = Path.join(cur, name);
			if (name === target) {
				return node;
			}
			if (isDirectory) {
				queue.push(node);
			}
		}
	}
	return null;
}

/**
 * Finds the root directory containing a specified item by traversing up from a
 * starting directory.
 */
export async function findTopLevel(options: {
	startDir: string;
	searchItem: string;
}): Promise<string | null> {
	const { startDir, searchItem } = options;
	let currentDir = startDir;

	while (currentDir !== "/" && currentDir !== "") {
		if (await exists(Path.resolve(currentDir, searchItem))) {
			return currentDir;
		}
		currentDir = Path.dirname(currentDir);
	}

	return null;
}
