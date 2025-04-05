import { fileStore } from "../store/file_store.ts";
import {
	getUserCacheDir,
	getUserConfigDir,
	getUserDataDir,
	getUserStateDir,
} from "../utils/local_fs.ts";
import type { Future } from "../utils/mod.ts";
import { Backend } from "./backend.ts";

export async function isolatedFileBackend(
	pwd: string,
	options?: {
		jail?: string;
		cacheDir?: string;
		stateDir?: string;
		configDir?: string;
		dataDir?: string;
	},
): Future.Future<Backend> {
	const dataDir = options?.dataDir ?? "data";
	const configDir = options?.configDir ?? "config";
	const stateDir = options?.stateDir ?? "state";
	const cacheDir = options?.cacheDir ?? "cache";
	const jail = options?.jail ?? pwd;
	const rootStore = fileStore({ pwd, jail });

	const data = rootStore.child(dataDir);
	const state = rootStore.child(stateDir);
	const config = rootStore.child(configDir);
	const cache = rootStore.child(cacheDir);

	const validKeys = ["HOME", "KEG_CURRENT", "KNUT_CONFIG", "PWD"];
	return new Backend({
		type: "file",
		env: {
			getHome() {
				return Deno.env.get("HOME") ?? null;
			},
			getCWD() {
				return Deno.env.get("PWD") ?? null;
			},
			hasVal(key) {
				if (validKeys.includes(key)) {
					return Deno.env.has(key);
				}
				return false;
			},
			getVal(key) {
				if (validKeys.includes(key)) {
					return Deno.env.get(key) ?? null;
				}
				return null;
			},
		},
		data,
		state,
		config,
		cache,
	});
}

/**
 * Node environment. This typically will be running on a workstation or server
 */
export async function fileBackend(jail?: string): Future.Future<Backend> {
	const dataStore = fileStore({ pwd: await getUserDataDir(), jail }).child(
		"knut",
	);
	const stateStore = fileStore({ pwd: await getUserStateDir(), jail }).child(
		"knut",
	);
	const configStore = fileStore({ pwd: await getUserConfigDir(), jail })
		.child("knut");
	const cacheStore = fileStore({ pwd: await getUserCacheDir(), jail }).child(
		"knut",
	);

	const validKeys = ["HOME", "KEG_CURRENT", "KNUT_CONFIG", "PWD"];
	return new Backend({
		type: "file",
		env: {
			getHome() {
				return Deno.env.get("HOME") ?? null;
			},
			getCWD() {
				return Deno.env.get("PWD") ?? null;
			},
			getVal(key) {
				if (!validKeys.includes(key)) {
					return null;
				}
				return Deno.env.get(key) ?? null;
			},
			hasVal(key) {
				if (!validKeys.includes(key)) {
					return false;
				}
				return Deno.env.has(key);
			},
		},
		cache: cacheStore,
		data: dataStore,
		state: stateStore,
		config: configStore,
	});
}
