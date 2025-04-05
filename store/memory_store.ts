import { Path, Result } from "../utils/mod.ts";
import { MemoryFs } from "./memory_fs.ts";
import { Store } from "./store.ts";

export const storeType = "memory";

/**
 * Options for configuring a MemoryStore instance.
 */
export interface MemoryStoreOptions {
	/**
	 * The current working directory for the memory store.
	 */
	pwd?: string;

	/**
	 * The URI for accessing the memory store, if applicable.
	 */
	uri?: string;

	/**
	 * The initial content to be stored in the memory store.
	 */
	content?: string;
}

export function memoryStore(options?: MemoryStoreOptions): Store {
	const jail = "/";
	const pwd = Path.resolveWithinJail({
		jail,
		basePath: jail,
		path: options?.pwd ?? "/",
	});
	const content = options?.content;
	const uri = options?.uri ?? `memory://${pwd}`;
	const memory = content
		? Result.getOrElse(MemoryFs.parse(content), () => MemoryFs.empty(pwd))
		: MemoryFs.empty(pwd);
	return new Store(
		{ uri, jail, pwd },
		{
			storeType,
			async read(context, path) {
				return memory.read(context, path);
			},
			async write(context, path, content, options) {
				return memory.write(context, path, content, {
					recursive: options.recurive,
				});
			},
			async rm(context, path, options) {
				return memory.rm(context, path, options);
			},
			async mkdir(context, path, options) {
				return memory.mkdir(context, path, options);
			},
			async rmdir(context, path, options) {
				return memory.rmdir(context, path, options);
			},
			async readdir(context, path, options) {
				return memory.readdir(context, path);
			},
			async stats(context, path) {
				return memory.stats(context, path);
			},
			async utimes(context, path, stats) {
				return memory.utimes(context, path, stats);
			},
		},
	);
}
