import { exists } from "@std/fs";
import process from "node:process";
import { invariant } from "./errors.ts";
import { Path } from "./mod.ts";

export type Environment = "node" | "browser" | "deno" | "unknown";

/**
 * Detects the environment in which the code is running, determining whether it
 * is being executed in a user's system (Node.js), in a browser context, or in
 * Deno. This function returns a string indicating the environment type, which
 * can be useful for conditional logic based on the execution context.
 *
 * @returns A string indicating the environment type ("node", "browser",
 *          "deno", or "unknown").
 */
export function detectEnv(): Environment {
	if (typeof window !== "undefined") {
		return "browser";
	} else if (
		typeof process !== "undefined" &&
		process.versions != null &&
		process.versions.node != null
	) {
		return "node";
	} else if (typeof Deno !== "undefined") {
		return "deno";
	}
	return "unknown";
}

export async function findTarget(options: {
	root: string;
	target: string;
}): Promise<string | null> {
	const { root, target } = options;
	const queue: string[] = [root];
	while (queue.length > 0) {
		const cur = queue.shift();
		invariant(cur !== undefined);
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
