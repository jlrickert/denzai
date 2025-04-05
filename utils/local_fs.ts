import { homedir } from "node:os";
import { Future, Path } from "./mod.ts";
import process from "node:process";

export function getUserDataDir(): Future.Future<string> {
	const platform = process.platform;

	const dataDir = process.env.XDG_DATA_HOME ?? null;
	if (dataDir) {
		return Future.of(dataDir);
	}

	if (platform === "win32") {
		const dir = process.env.APPDATA || "";
		if (dir === "") {
			return Future.of(Path.join(homedir(), "AppData", "Local"));
		}
		return Future.of(dir);
	}

	if (platform === "darwin") {
		return Future.of(
			Path.join(homedir(), "Library", "Application Support"),
		);
	}

	if (platform === "linux") {
		return Future.of(Path.join(homedir(), ".local", "share"));
	}

	throw new Error(`Platform ${platform} not supported`);
}

export function getUserStateDir(): Future.Future<string> {
	const platform = process.platform;

	const dataDir = process.env.XDG_STATE_HOME ?? null;
	if (dataDir) {
		return Future.of(dataDir);
	}

	if (platform === "win32") {
		const dir = process.env.LOCALAPPDATA || "";
		if (dir === "") {
			return Future.of(Path.join(homedir(), "LocalAppData", "Local"));
		}
		return Future.of(dir);
	}

	if (platform === "darwin") {
		return Future.of(
			Path.join(homedir(), "Library", "Application Support"),
		);
	}

	if (platform === "linux") {
		return Future.of(Path.join(homedir(), ".local", "share"));
	}

	throw new Error(`Platform ${platform} not supported`);
}

export function getUserCacheDir(): Promise<string> {
	const platform = process.platform;

	const cacheDir = process.env.XDG_CACHE_HOME ?? null;
	if (cacheDir) {
		return Future.of(cacheDir);
	}

	if (platform === "win32") {
		const dir = process.env.LOCALAPPDATA || "";
		if (dir === "") {
			return Future.of(
				Path.join(homedir(), "AppData", "Local", "Caches"),
			);
		}
		return Future.of(Path.join(dir, "Temp"));
	}

	if (platform === "darwin") {
		return Future.of(Path.join(homedir(), "Library", "Caches"));
	}

	if (platform === "linux") {
		return Future.of(Path.join(homedir(), ".cache"));
	}

	throw new Error(`Platform ${platform} not supported`);
}

export function getUserConfigDir(): Promise<string> {
	const platform = process.platform;

	const configDir = process.env.XDG_CONFIG_HOME ?? null;
	if (configDir) {
		return Future.of(configDir);
	}

	if (platform === "win32") {
		const dir = process.env.APPDATA || "";
		if (dir === "") {
			return Future.of(Path.join(homedir(), "AppData", "Roaming"));
		}
		return Future.of(dir);
	}

	if (platform === "darwin") {
		return Future.of(Path.join(homedir(), "Library", "Preferences"));
	}

	if (platform === "linux") {
		return Future.of(Path.join(homedir(), ".config"));
	}
	throw new Error(`Platform ${platform} not supported`);
}
