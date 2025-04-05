import { Path, Result } from "../utils/mod.ts";
import { MemoryFs } from "./memory_fs.ts";
import { Store } from "./store.ts";
import { StoreErr } from "./errors.ts";

export const storeType = "web";

/**
 * Options for configuring a WebStore instance.
 */
export interface WebStoreOptions {
	/**
	 * The current working directory for the store.
	 * Defaults to "/" if not provided.
	 */
	pwd?: string;

	/**
	 * The URI for accessing the store, assumed to be prefixed with "web://".
	 * Used as an identifier.
	 */
	uri?: string;

	/**
	 * A jail path to restrict the store's accessible paths.
	 * Defaults to "/" if not provided.
	 */
	jail?: string;

	/**
	 * Prefix to use as a key for the file system in storage
	 */
	prefix?: string;
}

/**
 * Creates a web store that manages data in a specified storage mechanism.
 *
 * This function initializes a store with options for jail paths, current working
 * directories, and URIs. It handles data retrieval and storage while ensuring
 * that the data remains within the defined constraints. The store supports various
 * operations such as reading, writing, removing, and managing directories.
 *
 * Examples:
 * - Creating a store with default options:
 *   ```ts
 *   const store = webStore(localStorage);
 *   ```
 * - Creating a store with a specified jail and current working directory:
 *   ```ts
 *   const store = webStore(sessionStorage, { jail: "/myApp", pwd: "/home" });
 */
export function webStore(storage: Storage, options?: WebStoreOptions): Store {
	const jail = options?.jail ?? "/";
	const pwd = Path.resolveWithinJail({
		jail,
		basePath: jail,
		path: options?.pwd ?? "/",
	});
	const uri = options?.uri ?? `web://${pwd}`;
	const prefix = options?.prefix ?? "";
	const content = storage.getItem("prefix");
	const memory = content
		? Result.getOrElse(MemoryFs.parse(content), () => MemoryFs.empty(pwd))
		: MemoryFs.empty(pwd);

	function save() {
		try {
			storage.setItem(prefix, memory.toJson());
		} catch (error) {
			if (
				error instanceof DOMException &&
				error.code === DOMException.QUOTA_EXCEEDED_ERR
			) {
				return new StoreErr({
					code: "QUOTA_EXCEEDED",
					message: error.message,
					context: { storeType, error },
				}).toErr();
			}
			return new StoreErr({
				code: "UNKNOWN",
				context: {
					storeType,
					error,
				},
			}).toErr();
		}
	}
	return new Store(
		{ uri, jail, pwd },
		{
			storeType,
			async read(context, path) {
				return Result.tap(memory.read(context, path), () => save());
			},
			async write(context, path, content, options) {
				const err = memory.write(context, path, content, {
					recursive: options.recurive,
				});
				if (err === null) {
					save();
				}
				return err;
			},
			async rm(context, path, options) {
				const err = memory.rm(context, path, options);
				if (err === null) {
					save();
				}
				return err;
			},
			async mkdir(context, path, options) {
				const err = memory.mkdir(context, path, options);
				if (err === null) {
					save();
				}
				return err;
			},
			async rmdir(context, path, options) {
				const err = memory.rmdir(context, path, options);
				if (err === null) {
					save();
				}
				return err;
			},
			async readdir(context, path, options) {
				const err = memory.readdir(context, path);
				if (err === null) {
					save();
				}
				return err;
			},
			async stats(context, path) {
				return memory.stats(context, path);
			},
			async utimes(context, path, stats) {
				const err = memory.utimes(context, path, stats);
				if (err === null) {
					save();
				}
				return err;
			},
		},
	);
}
