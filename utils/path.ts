import { pipe } from "./funcs.ts";
import { Optional as O } from "./mod.ts";

/**
 * Joins multiple [segments] into a single path string, normalizing
 * the segments by removing empty parts and current directory indicators
 * ("."). If the first segment is an absolute path (starts with "/"),
 * the resultant path will also be absolute; otherwise, it will be relative.
 *
 * @param segments - The segments to join together.
 * @returns The combined path as a normalized string.
 */
export function join(...segments: string[]): string {
	const parts: string[] = [];

	for (const segment of segments) {
		segment.split("/").forEach((part) => {
			if (part === "" || part === ".") {
				return;
			}
			parts.push(part);
		});
	}

	if (segments.length > 0 && segments[0]!.startsWith("/")) {
		return "/" + parts.join("/");
	}

	return parts.join("/");
}

/**
 * Checks whether the given [path] is an absolute path. This function
 * returns true if the path begins with a "/" indicating it is absolute;
 * otherwise, it returns false.
 *
 * @param {string} path - The path to evaluate.
 * @returns {boolean} True if the path is absolute, false if it is relative.
 */
export function isAbsolute(path: string): boolean {
	return path.startsWith("/");
}

/**
 * Determines whether the given [path] is a relative path. This function
 * returns true if the path does not represent an absolute path;
 * otherwise, it returns false.
 *
 * @param {string} path - The path to evaluate.
 * @returns {boolean} True if the path is relative, false if it is absolute.
 */
export function isRelative(path: string): boolean {
	return !isAbsolute(path);
}

/**
 * Retrieves the base filename from the specified [path]. This function returns
 * the last segment of the path after splitting it by slashes. If the path is
 * empty, it returns [O.none].
 *
 * @param path The path from which to extract the filename.
 * @returns  The optional filename, or none if the path is empty.
 */
export function filename(path: string): O.Optional<string> {
	const segments = path.split("/");
	return segments[segments.length - 1];
}

/**
 * Retrieves the file extension from the given [path] if it exists.
 *
 * @param {string} path - The path from which to extract the file extension.
 * @returns {O.Optional<string>} The optional file extension, or none if not present.
 */
export function ext(path: string): O.Optional<string> {
	return pipe(
		O.some({}),
		O.bind("filename", () => filename(path)),
		O.bind("index", ({ filename }) => filename.lastIndexOf(".")),
		O.filter(({ index }) => index >= 0),
		O.chain(({ filename, index }) => filename.substring(index)),
	);
}

/**
 * Returns the directory name of the given [path]
 *
 * @param path The path to process and extract the directory name from.
 * @returns The cleaned directory name or the appropriate
 * indicator for the root or current directory.
 */
export function dirname(path: string): string {
	const segments = path.split("/");
	segments.pop();
	if (segments.length === 1 && isAbsolute(path)) {
		return "/";
	}
	if (segments.length === 0) {
		return ".";
	}
	return cleanPath(segments.join("/"));
}

function cleanPath(path: string): string {
	path = path.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
	if (isAbsolute(path)) {
		return path;
	}
	return path;
}

/**
 * Resolves a [relativePath] against a given [basePath]. If the [relativePath]
 * is determined to be an absolute path, it simply cleans and returns it.
 * Otherwise, the function constructs the resolved path by processing each part
 * of the [relativePath], handling ".." to move up directories and "." to stay
 * in the current directory. Finally, it returns the cleaned absolute path.
 *
 * @param basePath - The base path to resolve against.
 * @param relativePath - The path to resolve relative to the base.
 * @returns The resolved absolute path.
 */
export function resolve(basePath: string, relativePath: string): string {
	if (isAbsolute(relativePath)) {
		// If the relative path is an absolute path, just clean it.
		return cleanPath(relativePath);
	}

	const baseParts = basePath.split("/").filter((part) => part.length > 0);
	const parts = relativePath.split("/");

	for (const part of parts) {
		if (part === "..") {
			if (baseParts.length > 0) {
				baseParts.pop();
			}
		} else if (part !== "." && part !== "") {
			baseParts.push(part);
		}
	}

	return cleanPath("/" + baseParts.join("/"));
}

/**
 * Computes the relative path from a given absolute [from] path to another
 * absolute [to] path. This function cleans and splits both paths into their
 * component parts to determine how many directory steps are needed to traverse
 * from the [from] path to the [to] path. It constructs the relative path using
 * the appropriate number of "../" segments and the remaining path components.
 *
 * @param from - The absolute path to resolve from.
 * @param to - The absolute path to resolve to.
 * @returns The computed relative path from [from] to [to].
 */
export function relative(from: string, to: string): string {
	const fromParts = cleanPath(from)
		.split("/")
		.filter((a) => a.length > 0);
	const toParts = cleanPath(to)
		.split("/")
		.filter((a) => a.length > 0);

	while (
		fromParts.length > 0 && toParts.length > 0 &&
		fromParts[0] === toParts[0]
	) {
		fromParts.shift();
		toParts.shift();
	}

	const upSteps = fromParts.length;
	const remainingPath = toParts.join("/");
	const relativePath = "../".repeat(upSteps) + remainingPath;

	return cleanPath(relativePath ?? ".");
}

/**
 * Determines whether a given [resolvedPath] is within the specified
 * [root] directory. This function checks if the [resolvedPath] starts
 * with the [root] path, indicating that it lies within the root's
 * boundaries.
 *
 * @param {string} root - The root directory to check against.
 * @param {string} resolvedPath - The path to verify if it is within the root.
 * @returns {boolean} True if the resolved path is within the root, false otherwise.
 */
export function withinRoot(root: string, resolvedPath: string): boolean {
	return resolvedPath.startsWith(root);
}

/**
 * Resolves a given [path] against a [basePath] within the constraints
 * of a specified [jail]. This function ensures that the resolved path
 * remains within the defined [jail] directory. If the resolved path
 * does not start with the [jail] directory, it prepends the [jail]
 * to the resolved path. The returned path will also avoid any trailing
 * slashes.
 *
 * @param {Object} args - The parameters for resolving the path.
 * @param {string} args.jail - The jail path to restrict access.
 * @param {string} args.basePath - The base path from which to resolve.
 * @param {string} args.path - The path to resolve.
 * @returns {string} The resolved path, ensuring it is within the jail.
 */
export function resolveWithinJail(
	args: { jail: string; basePath: string; path: string },
): string {
	const { jail, basePath, path } = args;

	const resolvedPath = resolve(basePath, path);

	// Ensure the beginning of the resolved path matches the root. Adjust this
	// logic based on the requirement to handle absolute paths.
	let finalPath = resolvedPath;
	if (!withinJail(jail, resolvedPath)) {
		finalPath = `${jail}/${resolvedPath}`.replace(/\/\/+/g, "/");
	}

	if (finalPath === "/") {
		return finalPath;
	}

	return finalPath.replace(/\/$/, ""); // Ensure no trailing slash.
}

/**
 * Checks whether a given [path] is within the specified [jail] directory.
 * If the [path] is relative, it will return true, indicating that it
 * cannot be outside the jail context. If the [path] is absolute, it
 * verifies whether it begins with the [jail] directory, returning
 * true if it does and false otherwise.
 *
 * @param {string} jail - The jail path to restrict access.
 * @param {string} path - The path to check against the jail.
 * @returns {boolean} True if the path is within the jail, false otherwise.
 */
export function withinJail(jail: string, path: string): boolean {
	if (isRelative(path)) {
		return true;
	}
	return path.startsWith(jail);
}
