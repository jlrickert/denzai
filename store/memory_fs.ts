import { StoreErr } from "../store/errors.ts";
import type { StoreContext, StoreNodeTime } from "../store/mod.ts";
import { invariant } from "../utils/errors.ts";
import { Json, Optional, Path, Result } from "../utils/mod.ts";
import { isSome } from "../utils/optional.ts";

export interface StoreNodeStats extends StoreNodeTime {
	isFile(): boolean;
	isDirectory(): boolean;
}

export type FsNodeTimestamps = {
	mtime: string;
	atime: string;
	ctime: string;
	btime: string;
};

export type FsFileNode = {
	type: "f";
	content: string;
	/** absolute path */
	path: string;
	stats: StoreNodeTime;
};

function makeFilenode(
	{ content, path, stats }: Omit<FsFileNode, "type">,
): FsFileNode {
	return {
		type: "f",
		path,
		content,
		stats: { ...stats },
	};
}

export type FsDirNode = {
	type: "d";
	/** absolute path */
	path: string;
	children: string[];
	stats: StoreNodeTime;
};

function makeDirnode(
	{ stats, path, children }: Omit<FsDirNode, "type">,
): FsDirNode {
	return {
		type: "d",
		path,
		stats: { ...stats },
		children: [...children],
	};
}

function isDirNode(node: FsNode): node is FsDirNode {
	return node.type === "d";
}

export type FsNode = FsFileNode | FsDirNode;

type Fs = {
	version: "0.1";
	nodes: FsNode[];
	index: { [filepath: string]: number };
};

export class MemoryFs {
	static parse(content: string): Result.Result<MemoryFs, StoreErr> {
		const fs = Result.match(Json.parse(content), {
			onOk(a) {
				return Result.ok(a as Fs);
			},
			onErr: (error) => {
				return new StoreErr({
					code: "SYNTAX",
					message: "Unexpected data schema",
					context: {
						content,
						error,
					},
				}).toErr();
			},
		});

		if (Result.isErr(fs)) {
			return fs;
		}

		switch (fs.value.version) {
			case "0.1": {
				for (let i = 0; i < fs.value.nodes.length; i++) {
					const node = fs.value.nodes[i];
					invariant(isSome(node));
					node;
					if (node.stats.ctime) {
						node.stats.ctime = new Date(node.stats.ctime);
					}
					if (node.stats.btime) {
						node.stats.btime = new Date(node.stats.btime);
					}
					if (node.stats.atime) {
						node.stats.atime = new Date(node.stats.atime);
					}
					if (node.stats.mtime) {
						node.stats.mtime = new Date(node.stats.mtime);
					}
				}
				return Result.ok(new MemoryFs(fs.value));
			}
			default: {
				return new StoreErr({
					code: "SCHEMA",
					message: "Invalid schema version",
					context: { content },
				}).toErr();
			}
		}
	}

	static empty(root: string, currentTime?: Date): MemoryFs {
		const time = currentTime ?? new Date();
		return new MemoryFs({
			version: "0.1",
			nodes: [
				{
					type: "d",
					path: "/",
					stats: {
						atime: time,
						ctime: time,
						mtime: time,
						btime: time,
					},
					children: [],
				},
			],
			index: {
				"/": 0,
			},
		});
	}

	private constructor(private fs: Fs) {}

	stats(
		context: StoreContext,
		path: string,
	): Result.Result<StoreNodeStats, StoreErr> {
		const resolvedPath = Path.resolveWithinJail({
			jail: context.jail,
			basePath: context.pwd,
			path,
		});
		const node = this.getNode(resolvedPath);
		if (!node) {
			return new StoreErr({
				code: "PATH_NOT_FOUND",
				message: `Path "${path}" not found`,
				context: {
					path,
					resolvedPath,
					fs: Json.jsonify(this.fs),
					...context,
				},
			}).toErr();
		}
		return Result.ok({
			atime: node.stats.atime ?? new Date(),
			btime: node.stats.btime ?? new Date(),
			ctime: node.stats.ctime ?? new Date(),
			mtime: node.stats.mtime ?? new Date(),
			isFile() {
				return node.type === "f";
			},
			isDirectory() {
				return node.type === "d";
			},
		});
	}

	read(
		context: StoreContext,
		filename: string,
	): Result.Result<string, StoreErr> {
		const resolvedPath = Path.resolveWithinJail({
			path: filename,
			basePath: context.pwd,
			jail: context.jail,
		});
		const node = this.getNode(resolvedPath);
		if (node && node.type === "f") {
			node.stats.atime = new Date();
			const parent = Optional.unwrap(
				Optional.fromNullable(this.getNode(Path.dirname(node.path))),
			);
			parent.stats.atime = new Date();
			return Result.ok(node.content);
		}
		return new StoreErr({
			code: "FILE_NOT_FOUND",
			message: `File "${filename}" not found`,
			context: { filename, fs: Json.jsonify(this.fs), ...context },
		}).toErr();
	}

	write(
		context: StoreContext,
		path: string,
		content: string,
		options?: { recursive?: boolean; timestamp?: Date },
	): StoreErr | null {
		const resolvedPath = Path.resolveWithinJail({
			path,
			basePath: context.pwd,
			jail: context.jail,
		});
		const timestamp = options?.timestamp ?? new Date();
		const recursive = options?.recursive ?? true;

		//
		// Handle case were path is a directory
		//
		const node = this.getNode(resolvedPath);
		if (node?.type === "d") {
			return new StoreErr({
				code: "PATH_NOT_FOUND",
				context: { path, fs: Json.jsonify(this.fs), ...context },
			});
		}

		//
		// handle case were path is a file
		//
		if (node?.type === "f") {
			node.content = content;
			node.stats.mtime = timestamp;
			const parent = this.getParent(resolvedPath);
			invariant(parent?.type === "d");
			parent.stats.mtime = timestamp;
			return null;
		}

		//
		// Handle case where it doesn't exist yet
		//

		// If recursive create parent
		let parent = this.getParent(resolvedPath);
		if (recursive && parent === null) {
			const res = this.mkdir(context, Path.dirname(resolvedPath), {
				recursive,
				timestamp,
			});
			if (res !== null) {
				return res;
			}
			parent = this.getParent(resolvedPath);
			invariant(parent?.type === "d");
		}

		// Check to see if there a valid parent
		if (parent?.type !== "d") {
			return new StoreErr({
				code: "PATH_UNAVAILABLE",
				message: `Path "${path}" not found`,
				context: { path, fs: Json.jsonify(this.fs), ...context },
			});
		}

		// Actually add the node
		this.addNode({
			node: makeFilenode({
				path: resolvedPath,
				content,
				stats: {
					atime: timestamp,
					mtime: timestamp,
					ctime: timestamp,
					btime: timestamp,
				},
			}),
			timestamp,
		});
		return null;
	}

	rm(
		context: StoreContext,
		path: string,
		options?: {
			recursive?: boolean | undefined;
			timestamp?: Date | undefined;
			rebuildIndex?: false | undefined;
		},
	): StoreErr | null {
		const resolvedPath = Path.resolveWithinJail({
			path,
			basePath: context.pwd,
			jail: context.jail,
		});
		const recursive = options?.recursive ?? false;
		const timestamp = options?.timestamp ?? new Date();
		const rebuildIndex = options?.rebuildIndex ?? true;
		const node = this.getNode(resolvedPath);
		if (!node) {
			return null;
		}
		//
		// Handle case where file exists
		//
		if (node.type === "f") {
			const index = this.fs.index[node.path];
			invariant(index !== undefined);
			delete this.fs.nodes[index];
			const parent = this.getParent(path);
			invariant(parent?.type === "d");
			parent.stats.mtime = options?.timestamp ?? new Date();
		} else if (recursive && node.type === "d") {
			for (const n of node.children) {
				this.rm(context, n, {
					recursive: true,
					timestamp,
					rebuildIndex: false,
				});
			}
			const index = this.fs.index[node.path];
			invariant(index !== undefined);
			delete this.fs.nodes[index];
			const parent = this.getParent(path);
			invariant(parent?.type === "d");
			parent.stats.mtime = options?.timestamp ?? new Date();
		} else if (node.type === "d") {
			return new StoreErr({
				code: "DIR_EXISTS",
				message: "Cannot rm a directory",
				context: {
					dirname: node.path,
					fs: Json.jsonify(this.fs),
					...context,
				},
			});
		} else {
			return new StoreErr({
				code: "PATH_NOT_FOUND",
				message: `Path "${path}" not found`,
				context: { path, fs: Json.jsonify(this.fs), ...context },
			});
		}

		if (rebuildIndex) {
			this.rebuildIndex();
		}
		return null;
	}

	readdir(
		context: StoreContext,
		path: string,
	): Result.Result<string[], StoreErr> {
		const resolvedPath = Path.resolveWithinJail({
			path,
			basePath: context.pwd,
			jail: context.jail,
		});
		const node = this.getNode(resolvedPath);
		if (node?.type === "d") {
			return Result.ok(
				node.children.map((child) =>
					Path.relative(resolvedPath, child)
				),
			);
		} else if (node?.type === "f") {
			return new StoreErr({
				code: "NOT_A_DIR",
				message: `"${path}" is not a directory`,
				context: {
					path: resolvedPath,
					fs: Json.jsonify(this.fs),
					...context,
				},
			}).toErr();
		}
		return new StoreErr({
			code: "PATH_NOT_FOUND",
			message: `Path "${path}" not found`,
			context: {
				path: resolvedPath,
				fs: Json.jsonify(this.fs),
				...context,
			},
		}).toErr();
	}

	rmdir(
		context: StoreContext,
		path: string,
		options?: {
			recursive?: boolean;
			timestamp?: Date;
			rebuildIndex?: false;
		},
	): StoreErr | null {
		const resolvedPath = Path.resolveWithinJail({
			path,
			basePath: context.pwd,
			jail: context.jail,
		});
		const node = this.getNode(resolvedPath);
		if (!node) {
			return null;
		}
		if (node?.type === "d" && node.children.length === 0) {
			return this.rm(context, path);
		}
		if (node?.type === "d" && node.children.length > 0) {
			return this.rm(context, path, { recursive: true });
		}
		if (node?.type === "f") {
			return new StoreErr({
				code: "PATH_NOT_FOUND",
				message: `${path} is not a directory`,
				context: { path, fs: Json.jsonify(this.fs), ...context },
			});
		}
		return new StoreErr({
			code: "PATH_NOT_FOUND",
			message: `"${path}" not found`,
			context: { path, fs: Json.jsonify(this.fs), ...context },
		});
	}

	mkdir(
		context: StoreContext,
		path: string,
		options?: { recursive?: boolean; timestamp?: Date },
	): StoreErr | null {
		const resolvedPath = Path.resolveWithinJail({
			path,
			basePath: context.pwd,
			jail: context.jail,
		});
		const timestamp = options?.timestamp ?? new Date();
		const recursive = options?.recursive ?? true;
		const node = this.getNode(resolvedPath);

		// Unable to make a directory if target already exists as a file
		if (node?.type === "f") {
			return new StoreErr({
				code: "FILE_EXISTS",
				message: `File ${node.path} already exists`,
				context: {
					filename: node.path,
					fs: Json.jsonify(this.fs),
					...context,
				},
			});
		}

		// Nothing to do if it already exists
		if (node?.type === "d") {
			return null;
		}

		// Handle the non recursive case. Create directory if and only if there
		// exists a parent directory
		if (!recursive) {
			const parent = this.getNode(Path.dirname(resolvedPath));
			// Parent directory of target must exist
			if (parent?.type !== "d") {
				return new StoreErr({
					code: "PATH_UNAVAILABLE",
					message: `Path "${path}" not available`,
					context: { path, fs: Json.jsonify(this.fs), ...context },
				});
			}
			this.addNode({
				node: makeDirnode({
					path: resolvedPath,
					children: [],
					stats: {
						atime: timestamp,
						btime: timestamp,
						ctime: timestamp,
						mtime: timestamp,
					},
				}),
				timestamp,
			});
			return null;
		}

		const pathExists = this.hasPathAvailable(resolvedPath);
		if (!pathExists) {
			return new StoreErr({
				code: "PATH_UNAVAILABLE",
				message: `Path ${path} not available`,
				context: { path, fs: Json.jsonify(this.fs), ...context },
			});
		}
		for (const p of this.getPaths(resolvedPath)) {
			if (this.getNode(p) === null) {
				this.addNode({
					node: makeDirnode({
						path: p,
						children: [],
						stats: {
							atime: timestamp,
							btime: timestamp,
							ctime: timestamp,
							mtime: timestamp,
						},
					}),
					timestamp,
					rebuildIndex: false,
				});
			}
		}
		this.rebuildIndex();
		return null;
	}

	utimes(
		context: StoreContext,
		path: string,
		stats: StoreNodeTime,
	): StoreErr | null {
		const resolvedPath = Path.resolveWithinJail({
			path,
			basePath: context.pwd,
			jail: context.jail,
		});
		const node = this.getNode(resolvedPath);
		if (node) {
			node.stats = { ...node.stats, ...stats };
			return null;
		}
		return new StoreErr({
			code: "PATH_NOT_FOUND",
			message: `Path "${path}" not found`,
			context: { path, fs: Json.jsonify(this.fs), ...context },
		});
	}

	private getNode(path: string) {
		const resolvedPath = Path.resolve("/", path);
		const index = this.fs.index[resolvedPath];
		const node = index !== undefined ? this.fs.nodes[index] : null;
		return node;
	}

	private rebuildIndex(): void {
		this.fs.index = {};
		this.fs.nodes.sort((a, b) => (a.path < b.path ? -1 : 1));
		for (let i = 0; i < this.fs.nodes.length; i++) {
			const node = this.fs.nodes[i];
			invariant(Optional.isSome(node));
			this.fs.index[node.path] = i;
		}
	}

	public toJson(): string {
		return Json.stringify(this.fs as any);
	}

	/**
	 * Checks if all directories in the given absolute [path] are available,
	 * ensuring that no file exists at any part of the specified path.
	 *
	 * @param [path] - The absolute path to check.
	 * @returns True if all directories are available, false if any file exists.
	 */
	private hasPathAvailable(path: string): boolean {
		const parts = path.split("/");
		const paths = [];
		let cur = "/";
		for (const part of parts) {
			cur = Path.join(cur, part);
			const node = this.getNode(cur);
			if (node?.type === "f") {
				return false;
			}
			paths.push(cur);
		}
		return true;
	}

	/**
	 * Generates an array of paths from the given [path] by resolving it
	 * to an absolute path, splitting it into parts, and joining each
	 * part cumulatively.
	 *
	 * Examples:
	 * - For the input "/foo/bar", the output will be ["/", "/foo", "/foo/bar"].
	 * - For the input "baz/qux", the output will be ["/", "/baz", "/baz/qux"].
	 *
	 * @param [path] - The input path to process.
	 * @returns An array of cumulative paths.
	 */
	private getPaths(path: string): string[] {
		const parts = Path.resolve("/", path).split("/");
		const paths = [];
		let cur = "/";
		for (const part of parts) {
			cur = Path.join(cur, part);
			paths.push(cur);
		}
		return paths;
	}

	private addNode(
		args: { node: FsNode; timestamp?: Date; rebuildIndex?: boolean },
	) {
		const rebuild = args?.rebuildIndex ?? false;
		const ts = args.timestamp ?? new Date();
		this.fs.index[args.node.path] = this.fs.nodes.length;
		this.fs.nodes[this.fs.nodes.length] = args.node;
		const parent = this.getNode(Path.dirname(args.node.path));
		invariant(Optional.isSome(parent));
		invariant(parent !== null && isDirNode(parent));
		parent.children.push(args.node.path);
		parent.children.sort();
		parent.stats.mtime = ts;
		if (rebuild) {
			this.rebuildIndex();
		}
	}

	private getParent(path: string) {
		const parent = this.getNode(Path.dirname(Path.resolve("/", path)));
		return parent;
	}
}
