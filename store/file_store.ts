import { homedir } from "node:os";
import * as FS from "node:fs/promises";
import { Future, Json, Path, pipe, Result } from "../utils/mod.ts";
import { StoreErr } from "./errors.ts";
import { invariant } from "../utils/errors.ts";
import { isJsonObject } from "../utils/json.ts";
import { Store, type StoreApi } from "./store.ts";
import type { StoreContext, StoreNodeTime } from "./mod.ts";

function isNumberic(value: string) {
	return /^[0-9]+$/.test(value);
}

export const storeType = "file";

function resolve({ jail, pwd }: StoreContext, path: string): string {
	const home = homedir();
	const fixedPwd = pwd.startsWith("~") ? Path.join(home, pwd.slice(1)) : pwd;
	const fixedPath = path.startsWith("~") ? `${home}/${path.slice(1)}` : path;
	return Path.resolveWithinJail({
		jail,
		basePath: fixedPwd,
		path: fixedPath,
	});
}

async function read(context: StoreContext, path: string) {
	const jailedPath = resolve(context, path);
	return await Future.tryCatch(
		() => FS.readFile(jailedPath, { encoding: "utf-8" }),
		(error) => {
			if ((error as any).code === "ENOENT") {
				return new StoreErr({
					code: "FILE_NOT_FOUND",
					message: `File ${path} not found`,
					context: { filename: path, path, jailedPath, ...context },
				});
			}
			return new StoreErr({
				code: "UNKNOWN",
				message: `Unable to read file "${path}"`,
				context: { op: "readfile", path, jailedPath, ...context },
			});
		},
	);
}

async function readdir(
	context: StoreContext,
	path: string,
	options?: { recursive?: boolean },
) {
	const jailedPath = resolve(context, path);
	const opts = { encoding: "utf-8" as const, recursive: options?.recursive };
	return await Future.tryCatch(
		() => FS.readdir(jailedPath, opts),
		(error) => {
			if ((error as any).code === "ENOENT") {
				const ctx = {
					op: "readdir",
					filename: path,
					path,
					jailedPath,
					options: opts,
					...context,
				};
				invariant(isJsonObject(ctx));
				return new StoreErr({
					code: "FILE_NOT_FOUND",
					message: `File ${path} not found`,
					context: { ...ctx, error },
				});
			}
			const ctx = Json.jsonify({
				op: "readdir",
				path,
				jailedPath,
				options: opts,
				...context,
			});
			invariant(isJsonObject(ctx));
			return new StoreErr({
				code: "UNKNOWN",
				message: `Unable to read file "${path}"`,
				context: { ...ctx, error },
			});
		},
	);
}

async function rm(
	context: StoreContext,
	path: string,
	options?: { recursive?: boolean },
) {
	const jailedPath = resolve(context, path);
	const res = await Future.tryCatch(
		() => FS.rm(path, options),
		(error) => {
			const ctx = {
				op: "rm",
				path,
				jailedPath,
				options,
				...context,
			};
			invariant(isJsonObject(ctx));
			return new StoreErr({
				code: "UNKNOWN",
				message: `Unable to remove "${path}"`,
				context: { ...ctx, error },
			});
		},
	);
	return Result.match(res, {
		onOk() {
			return null;
		},
		onErr(err) {
			return err;
		},
	});
}

async function rmdir(
	context: StoreContext,
	path: string,
	options?: { recursive?: boolean },
) {
	const jailedPath = resolve(context, path);
	const res = await Future.tryCatch(
		() => FS.rmdir(path, options),
		(error) => {
			const ctx = {
				op: "rmdir",
				path,
				jailedPath,
				options,
				...context,
			};
			invariant(isJsonObject(ctx));
			return new StoreErr({
				code: "UNKNOWN",
				message: `Unable to remove directory "${path}"`,
				context: { ...ctx, error },
			});
		},
	);
	return Result.match(res, {
		onOk() {
			return null;
		},
		onErr(err) {
			return err;
		},
	});
}

async function mkdir(
	context: StoreContext,
	path: string,
	options?: { recursive?: boolean },
) {
	const jailedPath = resolve(context, path);
	const res = await Future.tryCatch(
		() => FS.mkdir(jailedPath, { recursive: options?.recursive ?? true }),
		(error) => {
			const ctx = {
				op: "mkdir",
				path,
				jailedPath,
				options,
				...context,
			};
			invariant(isJsonObject(ctx));
			return new StoreErr({
				code: "UNKNOWN",
				message: `Unable to make directory "${path}"`,
				context: { ...ctx, error },
			});
		},
	);
	return Result.match(res, {
		onOk() {
			return null;
		},
		onErr(err) {
			return err;
		},
	});
}

async function writeFile(context: StoreContext, path: string, content: string) {
	const jailedPath = resolve(context, path);
	const res = await Future.tryCatch(
		() => {
			return FS.writeFile(jailedPath, content, { encoding: "utf-8" });
		},
		(error) => {
			const ctx = {
				op: "writeFile",
				path,
				content,
				jailedPath,
				...context,
			};
			return new StoreErr({
				code: "UNKNOWN",
				context: { ...ctx, error },
			});
		},
	);
	return Result.match(res, {
		onErr(err) {
			return err;
		},
		onOk() {
			return null;
		},
	});
}

function stats(context: StoreContext, path: string) {
	const jailedPath = resolve(context, path);
	return Future.tryCatch(
		() => FS.stat(jailedPath),
		(error) => {
			return new StoreErr({
				code: "UNKNOWN",
				message: `Unable to stat "${jailedPath}"`,
				context: { op: "stat", path, jailedPath, ...context, error },
			});
		},
	);
}

async function utimes(
	context: StoreContext,
	path: string,
	stats: StoreNodeTime,
) {
	const jailedPath = resolve(context, path);
	const now = new Date();
	const res = await Future.tryCatch(
		() => FS.utimes(jailedPath, stats.atime ?? now, stats.mtime ?? now),
		(error) => {
			return new StoreErr({
				code: "PATH_NOT_FOUND",
				message: `Unable to stat "${jailedPath}"`,
				context: { op: "stat", path, jailedPath, ...context, error },
			});
		},
	);
	return Result.match(res, {
		onErr(err) {
			return err;
		},
		onOk() {
			return null;
		},
	});
}

/**
 * Options for configuring a FileStore instance.
 */
export interface FileStoreOptions {
	/**
	 * The URI for accessing the file store, prefixed with "file://".
	 */
	uri?: string;

	/**
	 * A jail path to restrict the file store's accessible paths. Defaults to
	 * the home directory if not provided.
	 */
	jail?: string;

	/**
	 * The current working directory for the file store. Defaults to the home
	 * directory if not provided.
	 */
	pwd?: string;
	readOnly?: boolean;
}

/**
 * Creates a [StoreApi] implementation for file-based storage operations. This
 * function allows for optional read-only behavior, preventing write operations
 * if specified.
 *
 * @param readonly - Indicates whether the store should be read-only.
 * @returns A StoreApi implementation for file operations.
 */
function makeFileStoreApi(readonly = false): StoreApi {
	return {
		storeType,
		async read(context, path) {
			return read(context, path);
		},
		async write(context, path, content, options) {
			if (readonly) {
				return new StoreErr({
					code: "READ_ONLY",
					context,
				});
			}
			const recursive = options?.recurive ?? true;
			if (recursive) {
				const res = await mkdir(context, Path.dirname(path));
				if (res !== null) {
					return res;
				}
			}
			return await writeFile(context, path, content);
		},
		async rm(context, path, options) {
			if (readonly) {
				return new StoreErr({
					code: "READ_ONLY",
					context,
				});
			}
			return rm(context, path, options);
		},
		async mkdir(context, path, options) {
			if (readonly) {
				return new StoreErr({
					code: "READ_ONLY",
					context,
				});
			}
			return mkdir(context, path, { recursive: options.recursive });
		},
		async rmdir(context, path, options) {
			if (readonly) {
				return new StoreErr({
					code: "READ_ONLY",
					context,
				});
			}
			return rmdir(context, path, options);
		},
		async readdir(context, path, options) {
			const res = Result.map(
				await readdir(context, path, options),
				(children) => {
					children.sort((a, b) => {
						if (isNumberic(a) && isNumberic(b)) {
							return parseInt(a) - parseInt(b);
						}
						return a < b ? -1 : 1;
					});
					return children;
				},
			);
			if (options.relative) {
				return res;
			}
			if (!res.success) {
				return res;
			}

			// Convert to absolute paths
			const jailedPath = resolve(context, Path.dirname(path));
			return Result.map(
				res,
				(children) =>
					children.map((child) => Path.resolve(jailedPath, child)),
			);
		},
		async stats(context, path) {
			return Result.map(await stats(context, path), (s) => ({
				atime: s.atime,
				btime: s.birthtime,
				ctime: s.ctime,
				mtime: s.mtime,
				isFile() {
					return s.isFile();
				},
				isDirectory() {
					return s.isDirectory();
				},
			}));
		},
		async utimes(context, path, stats) {
			if (readonly) {
				return new StoreErr({
					code: "READ_ONLY",
					context,
				});
			}
			return utimes(context, path, stats);
		},
	};
}

/**
 * Initializes and exports the [StoreApi] for interacting
 * with file-based storage operations. This API provides methods
 * for reading, writing, and managing files and directories,
 * facilitating seamless integration with the file system.
 */
export const FileStoreApi = makeFileStoreApi();

/**
 * A read-only implementation of the [StoreApi]. This instance prevents any
 * write operations, ensuring that the underlying file store can only be read
 * from, making it suitable for scenarios where data integrity is critical and
 * modifications are not allowed.
 */
export const ReadonlyFileStoreApi = makeFileStoreApi(true);

/**
 * creates a File System store. This is the manages a local file system
 *
 * @param string uri is an absolute unix path.
 */
export function fileStore(options?: FileStoreOptions): Store {
	const readonly = options?.readOnly ?? false;
	const home = homedir();
	const jail = pipe(
		options?.jail ?? "/",
		(path) => path.startsWith("~") ? Path.join(home, path.slice(1)) : path,
	);
	const pwd = Path.resolveWithinJail({
		jail,
		basePath: options?.uri ?? "/",
		path: options?.pwd ?? "/",
	});

	const uri = options?.uri ?? `file://${pwd}`;
	return new Store(
		{ uri, jail, pwd },
		readonly ? ReadonlyFileStoreApi : FileStoreApi,
	);
}

/**
 * An empty file system storage that is located in a temporary location.
 * Removes temporary directory automatically.
 */
export async function tempFsStore(
	options?: Deno.MakeTempOptions,
): Promise<Store & AsyncDisposable> {
	const dir = options?.dir;
	const prefix = options?.prefix ?? "denzai-test";
	const suffix = options?.suffix;
	const rootPath = await Deno.makeTempDir({ dir, suffix, prefix });

	// @ts-expect-error Haven't figure this one out yet with the types
	const store: Store & AsyncDisposable = fileStore({
		jail: rootPath,
		pwd: rootPath,
		uri: `file://${rootPath}`,
	});
	store[Symbol.asyncDispose] = async () => {
		await FS.rm(rootPath, { recursive: true });
	};

	return store;
}
