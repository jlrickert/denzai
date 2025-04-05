import { BaseErr, type Future, Path, Result } from "../utils/mod.ts";
import type { StoreErr } from "./errors.ts";

/**
 * Represents the timing information for a store node, including various
 * timestamps related to the node's lifecycle. This type includes optional
 * properties for modified time, last accessed time, changed time, and birth
 * time, allowing for detailed tracking of the node's state.
 */
export type StoreNodeTime = {
	/**
	 * modified time
	 */
	mtime?: Date;

	/**
	 * last accessed time. This is when a file or directory was last read
	 */
	atime?: Date;

	/**
	 * changed time. This is when metadata is changed
	 */
	ctime?: Date;

	/**
	 * birth time. Time when the file was last created
	 */
	btime?: Date;
};

/**
 * Represents the statistics of a store node, combining the timing information
 * from [StoreNodeTime] with methods to determine if the node is a directory or
 * a file. This type provides a clear interface for working with node
 * statistics within the storage system, enabling easy checks on the type of
 * node.
 */
export type StoreNodeStats = StoreNodeTime & {
	isDirectory(): boolean;
	isFile(): boolean;
};

/**
 * Defines the API for interacting with a storage system, providing methods for
 * reading, writing, removing, and managing directories and files. Each method
 * requires a [StoreContext] and a relevant path, with additional parameters
 * for specific operations. This interface ensures a consistent approach to
 * managing storage operations within the system, handling errors through
 * [StoreErr].
 */
export interface StoreApi {
	readonly storeType: string;
	readonly read: (
		context: StoreContext,
		path: string,
	) => Future.FutureResult<string, StoreErr>;
	readonly write: (
		context: StoreContext,
		path: string,
		content: string,
		options: { recurive: boolean },
	) => Future.Future<StoreErr | null>;
	readonly rm: (
		context: StoreContext,
		path: string,
		options: { recursive: boolean },
	) => Future.Future<StoreErr | null>;
	readonly readdir: (
		context: StoreContext,
		path: string,
		options: { relative: boolean; recursive: boolean },
	) => Future.FutureResult<string[], StoreErr>;

	readonly mkdir: (
		context: StoreContext,
		path: string,
		options: { recursive: boolean },
	) => Future.Future<StoreErr | null>;
	readonly rmdir: (
		context: StoreContext,
		path: string,
		options: { recursive: boolean },
	) => Future.Future<StoreErr | null>;

	readonly stats: (
		context: StoreContext,
		path: string,
	) => Future.FutureResult<StoreNodeStats, StoreErr>;
	readonly utimes: (
		context: StoreContext,
		path: string,
		stats: StoreNodeTime,
	) => Future.Future<StoreErr | null>;
}

/**
 * Holds context about the store such as current working directory.
 */
export type StoreContext = {
	/**
	 * The URI of the store, following the format: <storeType>://<path>.
	 *
	 * @unstable Haven't worked out uri resolution
	 */
	uri: string;

	/**
	 * A jail path to restrict the store's accessible paths.
	 */
	jail: string;

	/**
	 * The current working directory for the store.
	 */
	pwd: string;
};

/**
 * Represents a storage interface for managing file operations, providing
 * methods for reading, writing, and manipulating directories and files. This
 * class includes functionality for handling paths, managing context, and
 * performing various storage operations while ensuring proper error handling.
 */
export class Store {
	private context: StoreContext;
	private api: StoreApi;
	constructor(context: StoreContext, api: StoreApi) {
		this.context = context;
		this.api = api;
	}

	/**
	 * Retrieves the URI of the store from the current context. provides the
	 * identifier for accessing the store, which may include protocol and path
	 * information.
	 *
	 * @returns The URI of the store.
	 */
	get uri() {
		return this.context.uri;
	}

	/**
	 * Retrieves the absolute path of the current working directory from the
	 * [context] object.
	 */
	get pwd(): string {
		return this.context.pwd;
	}

	/**
	 * Retrieves the base name of the file or path associated with this
	 * object, stripping away any directory structure or file extensions.
	 *
	 * @returns The base name of the file or path.
	 */
	basename(): string {
		if (this.pwd === "/") {
			return "/";
		}
		return Path.relative(Path.dirname(this.pwd), this.pwd);
	}

	/**
	 * Retrieves the jail path from the current context. Indicates the
	 * restricted path that the store can access, ensuring that operations
	 * remain within the defined boundaries.
	 *
	 * @returns The jail path of the store.
	 */
	get jail(): string {
		return this.context.jail;
	}

	/**
	 * Retrieves the type of the store from the current context. Provides
	 * information about the storage medium or method being used, allowing for
	 * differentiation between various store types.
	 *
	 * @returns The type of the store.
	 */
	get storeType(): string {
		return this.api.storeType;
	}

	/**
	 * Reads the contents of a file at the specified [path].
	 */
	async read(path: string): Future.FutureResult<string, StoreErr> {
		return this.api.read(this.context, path);
	}

	/**
	 * Reads the contents of the directory at the specified [path].
	 */
	async readdir(
		path: string,
		options?: { relative: boolean; recursive: boolean },
	): Future.FutureResult<string[], StoreErr> {
		return this.api.readdir(this.context, path, {
			recursive: options?.recursive ?? false,
			relative: options?.relative ?? true,
		});
	}

	/**
	 * Writes the specified [content] to the given [path].
	 *
	 * @param path - The path where the content should be written.
	 * @param content - The content to write to the specified path.
	 * @param options - Options for the write operation, including
	 *                  whether to write recursively.
	 * @returns Resolves to an error if the write fails, or null if successful.
	 */
	async write(
		path: string,
		content: string,
		options?: { recurive: boolean },
	): Future.Future<StoreErr | null> {
		return this.api.write(this.context, path, content, {
			recurive: options?.recurive ?? true,
		});
	}

	/**
	 * Creates a directory at the specified [path]. Calls the [mkdir] function
	 * in the API, passing the current context and options for recursive
	 * creation if specified.
	 */
	async mkdir(
		path: string,
		options?: { recurive: boolean },
	): Future.Future<StoreErr | null> {
		return this.api.mkdir(this.context, path, {
			recursive: options?.recurive ?? true,
		});
	}

	/**
	 * Removes the item at the specified [path]. This method calls the [rm]
	 * function in the API, passing the current context and options for
	 * recursive deletion if specified.
	 */
	async rm(
		path: string,
		options: { recursive?: boolean },
	): Future.Future<StoreErr | null> {
		return this.api.rm(this.context, path, {
			recursive: options.recursive ?? true,
		});
	}

	/**
	 * Removes the directory at the specified [path]. Calls the [rmdir]
	 * function in the API, passing the current context and options for
	 * recursive deletion if specified.
	 */
	async rmdir(
		path: string,
		options: { recursive?: boolean },
	): Future.Future<StoreErr | null> {
		return this.api.rmdir(this.context, path, {
			recursive: options.recursive ?? true,
		});
	}

	/**
	 * Retrieves the statistics for the specified [path] from the store. This
	 * method calls the [stats] function in the API.
	 */
	async stats(path: string): Future.FutureResult<StoreNodeStats, StoreErr> {
		return this.api.stats(this.context, path);
	}

	/**
	 * Updates the access and modification times of the specified [path] using
	 * the provided [stats] of type [StoreNodeTime]. This method calls the
	 * corresponding [utimes] function in the API to perform the update
	 * operation and returns any errors encountered during the process.
	 */
	async utimes(
		path: string,
		stats: StoreNodeTime,
	): Future.Future<StoreErr | null> {
		return this.api.utimes(this.context, path, stats);
	}

	/**
	 * Creates a child store based on the specified [path] or index. Resolves
	 * the new working directory using the current context's [jail] and [pwd],
	 * allowing for nested storage structures. It returns a new instance of
	 * [Store] configured with the updated context.
	 *
	 * @param path - The path or index to create the child store from.
	 * @returns A new Store instance representing the child store.
	 */
	child(path: string | number): Store {
		const pwd = Path.resolveWithinJail({
			jail: this.context.jail,
			basePath: this.context.pwd,
			path: String(path),
		});
		const context: StoreContext = {
			uri: this.context.uri,
			pwd,
			jail: this.context.jail,
		};
		return new Store(context, this.api);
	}

	/**
	 * Copies all contents from the [source] store to the [target] store. Reads
	 * the directory contents and handles both files and directories
	 * appropriately, ensuring that the target store reflects the structure and
	 * data of the source store.
	 */
	static async overwrite(
		args: { source: Store; target: Store },
	): Future.Future<StoreErr | null> {
		const { source, target } = args;
		const pathList = await source.readdir("");
		if (Result.isErr(pathList)) {
			return pathList.error;
		}
		for (const path of pathList.value) {
			const stats = await source.stats(path);
			BaseErr.invariant(
				Result.isOk(stats),
				"Expect readdir to only list items that exist",
			);
			if (stats.value.isDirectory()) {
				await target.mkdir(path);
				await Store.overwrite({
					source: source.child(path),
					target: target.child(path),
				});
			} else if (stats.value.isFile()) {
				const content = await source.read(path);
				BaseErr.invariant(
					Result.isOk(content),
					"Expect readdir to list a valid file",
				);
				await target.write(path, content.value);
			} else {
				throw new Error("Unhandled node type");
			}
		}
		return null;
	}

	/**
	 * Retrieves a list of node IDs from the store. It processes the directory
	 * entries and returns an array of node IDs or an error if the operation
	 * fails. This method is deprecated and should be replaced with a Dex
	 * instance for more efficient data retrieval.
	 *
	 * @deprecated use Dex instance instead. Plan on moving this to a generic
	 *             library.
	 *
	 * @returns A future result containing an array of node IDs or an error.
	 */
	async listNodes(): Future.FutureResult<number[], StoreErr> {
		const dirList = Result.map(
			await this.readdir(""),
			(list) =>
				list.reduce((acc, item) => {
					const n = Number.parseInt(item, 10);
					if (!isNaN(n) && n >= 0) {
						acc.push(n);
					}

					return acc;
				}, [] as number[]),
		);
		return dirList as any;
	}
}
