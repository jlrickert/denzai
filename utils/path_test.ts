import { assertEquals } from "@std/assert/equals";
import * as Path from "./path.ts";

Deno.test("Path.join", () => {
	const join = (...args: string[]) => Path.join(...args);

	assertEquals(join("/", "/"), "/");
	assertEquals(join("/a/b", "c", "d"), "/a/b/c/d");
	assertEquals(join("/a/b", "c/d"), "/a/b/c/d");
	assertEquals(join("/a/b", "c/////d"), "/a/b/c/d");
	assertEquals(join("/a/b", "..", "c", "d"), "/a/b/../c/d");
	assertEquals(join("/", "some", "path"), "/some/path");
	assertEquals(join("some", "path"), "some/path");
	assertEquals(join("../", "a/b/c"), "../a/b/c");
});

Deno.test("Path.resolve", () => {
	const root = "/jail";
	const testCase = (
		basePath: string,
		relativePath: string,
		expected: string,
	) => assertEquals(Path.resolve(basePath, relativePath), expected);

	testCase(root, "/a/b/c", "/a/b/c");
	testCase(root, "a/b/c", "/jail/a/b/c");
	testCase(root, "./a/b/c", "/jail/a/b/c");
	testCase(root, "", root);
	testCase(root, ".", root);
	testCase(root, "a/b/../c", "/jail/a/c");
	testCase(root, Path.join("../../", "a/b/c"), "/a/b/c");
	testCase(root, Path.join("../../", "a/b/c"), "/a/b/c");
	testCase(root, "../../../../../abc", "/abc");
	testCase("a", "b", "/a/b");
	testCase(
		Path.join(root, "some", "path"),
		Path.join("../", "a/b/c"),
		"/jail/some/a/b/c",
	);
	testCase(root, Path.join("../../", "a/b/c"), "/a/b/c");
	testCase("../ok", "../../example", "/example");
	testCase("/some/jail", "/some/jail/a", "/some/jail/a");
	testCase("/some/jail", "a", "/some/jail/a");
});

Deno.test("Path.relative", () => {
	const relative = (basepath: string, relativePath: string) => {
		return Path.relative(basepath, relativePath);
	};
	assertEquals(
		relative("/home/user/.config/knut", "/home/user/kegs/sample1"),
		"../../kegs/sample1",
	);
	assertEquals(relative("/", "/home/user/kegs"), "home/user/kegs");
	assertEquals(relative("/home/user", "/home/user/kegs"), "kegs");
	assertEquals(
		relative("/home/user", "/home/user/kegs/sample1"),
		"kegs/sample1",
	);
	assertEquals(
		relative("/home/user", "/home/user/kegs/sample1"),
		"kegs/sample1",
	);
	assertEquals(relative("/some/jail", "/some/jail/a"), "a");
	assertEquals(relative("/some/jail", "/some/jail/a"), "a");
	assertEquals(relative("/some/jail", "/some"), "..");
	assertEquals(relative("/some/jail", "/"), "../..");
});

Deno.test("Path.resolveWithinRoot", () => {
	const root = "/path/to/jail";
	const rwj = (basePath: string, path: string) => {
		return Path.resolveWithinJail({ jail: root, basePath, path });
	};

	assertEquals(rwj(root, "/"), root);
	assertEquals(rwj(root, "."), root);
	assertEquals(rwj("/a", "/"), root);
	assertEquals(rwj("a", "."), Path.join(root, "a"));
	assertEquals(rwj(root, "a"), Path.join(root, "a"));
	assertEquals(rwj(root, "/a"), Path.join(root, "a"));
	assertEquals(rwj(root, "/a/b/c"), Path.join(root, "a", "b", "c"));
	assertEquals(rwj(root, "a/b/c"), Path.join(root, "a", "b", "c"));
	assertEquals(
		rwj(Path.join(root, "w/x/y/z"), "/a/b/c"),
		Path.join(root, "a/b/c"),
	);
	assertEquals(
		rwj(Path.join(root, "w/x/y/z"), "a/b/c"),
		Path.join(root, "w/x/y/z/a/b/c"),
	);
	assertEquals(
		rwj(root, "../../../../a/b/c"),
		Path.join(root, "a", "b", "c"),
	);
	assertEquals(
		rwj(Path.join(root, "w/x/y/z"), "../../../a/b/c"),
		Path.join(root, "w/a/b/c"),
	);
	assertEquals(
		Path.resolveWithinJail({ jail: "/", basePath: "/", path: "/" }),
		"/",
	);
});

Deno.test("Path.direname", () => {
	const dirname = (path: string) => {
		return Path.dirname(path);
	};

	assertEquals(dirname("/some/path/to/file"), "/some/path/to");
	assertEquals(dirname("/rawr"), "/");
	assertEquals(dirname("rawr"), ".");
	assertEquals(dirname("/"), "/");
	assertEquals(dirname(""), ".");
});
