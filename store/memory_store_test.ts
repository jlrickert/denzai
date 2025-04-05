import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { BaseErr, omit, Result } from "../utils/mod.ts";
import { memoryStore } from "./memory_store.ts";
import { StoreErr } from "./errors.ts";

Deno.test("should be able to re read contents of recently written file", async () => {
	using fakeTimer = new FakeTime();

	const storage = memoryStore();
	fakeTimer.tick(60000);
	const now = new Date(fakeTimer.now);

	const message = "an example message";
	await storage.write("example", message);

	const content = Result.unwrap(await storage.read("example"));
	assertEquals(content, message);

	const stats = Result.unwrap(await storage.stats("example"));
	assertStrictEquals(stats.mtime?.toISOString(), now.toISOString());
	assertStrictEquals(stats.atime?.toISOString(), now.toISOString());
	assertStrictEquals(stats.ctime?.toISOString(), now.toISOString());
});

Deno.test("should be able to handle pathing", async () => {
	const storage = memoryStore();
	await storage.write("/a/b/c", "content");
	assertEquals(Result.unwrap(await storage.read("/a/b/c")), "content");
	assertEquals(
		Result.unwrap(await storage.child("a/b").read("c")),
		"content",
	);
});

Deno.test(
	"should create directories and updated modified time for parent directory when adding a new file",
	async () => {
		const initialTime = new Date("2023-03-23");
		using fakeTime = new FakeTime(initialTime);

		const check = async (path: string, mtime: Date) => {
			const stats = Result.unwrap(await storage.stats(path));
			assertStrictEquals(
				stats.atime?.toISOString(),
				initialTime.toISOString(),
			);
			assertStrictEquals(stats.mtime?.toISOString(), mtime.toISOString());
			assertStrictEquals(
				stats.ctime?.toISOString(),
				initialTime.toISOString(),
			);
		};

		const storage = memoryStore();
		await storage.mkdir("/path/to/some/dir");

		fakeTime.tick(1000);
		const now = new Date(fakeTime.now);

		const message = "an example message";
		await storage.write("/path/to/some/dir/example", message);

		await check("/", initialTime);
		await check("/path", initialTime);
		await check("/path/to", initialTime);
		await check("/path/to/some", initialTime);
		await check("/path/to/some/dir", now);
	},
);

Deno.test(
	"should update access times for a file and ancestor directories when a node is read",
	async () => {
		using fakeTime = new FakeTime();
		const initialTime = new Date(fakeTime.now);

		const check = async (path: string, atime: Date) => {
			const stats = Result.unwrap(await storage.stats(path));
			assertStrictEquals(
				stats.mtime?.toISOString(),
				initialTime.toISOString(),
			);
			assertStrictEquals(
				stats.ctime?.toISOString(),
				initialTime.toISOString(),
			);
			assertStrictEquals(stats.atime?.toISOString(), atime.toISOString());
		};

		const storage = memoryStore({ pwd: "/" });
		await storage.write("/path/to/some/example", "example text");

		fakeTime.tick(60000);
		const now = new Date(fakeTime.now);

		await check("/path", initialTime);
		await check("/path/to", initialTime);
		await check("/path/to/some", initialTime);
		await check("/path/to/some/example", initialTime);

		await storage.read("/path/to/some/example");

		await check("/", initialTime);
		await check("/path", initialTime);
		await check("/path/to", initialTime);
		await check("/path/to/some", now);
		await check("/path/to/some/example", now);
	},
);

Deno.test("should be able to list the expected directories", async () => {
	const storage = memoryStore();
	await storage.write("/path/a/a", "file a");
	await storage.write("/path/b/b", "file b");
	await storage.write("/path/c/c", "file c");
	await storage.write("/path/d/d", "file d");
	const directories = Result.unwrap(await storage.readdir("/path"));
	assertEquals(directories, ["a", "b", "c", "d"]);
	const childStorage = storage.child("path");
	assertEquals(childStorage.pwd, "/path");
	assertEquals(
		await childStorage.readdir("path"),
		new StoreErr({
			code: "PATH_NOT_FOUND",
			context: { path: "/path/path" },
		}).toErr(),
	);
	assertEquals(Result.unwrap(await childStorage.readdir("a")), ["a"]);
	assertEquals(Result.unwrap(await childStorage.readdir("")), [
		"a",
		"b",
		"c",
		"d",
	]);
});

Deno.test("should create parent directories when needed", async () => {
	using time = new FakeTime();
	const now = new Date(time.now);

	const storage = memoryStore();
	const message = "an example message";
	await storage.write("/path/to/example", message);
	const content = Result.unwrap(await storage.read("/path/to/example"));
	assertEquals(content, message);

	{
		const files = Result.unwrap(await storage.readdir("/path/to"));
		assertEquals(files, ["example"]);
	}

	{
		const files = Result.unwrap(await storage.readdir("/path"));
		assertEquals(files, ["to"]);
	}

	{
		const files = Result.unwrap(await storage.readdir(""));
		assertEquals(files, ["path"]);
	}
	{
		const files = Result.unwrap(await storage.readdir("/"));
		assertEquals(files, ["path"]);
	}

	{
		const stats = Result.unwrap(await storage.stats("/path/to/example"));
		BaseErr.invariant(stats.atime && stats.ctime && stats.mtime);
		assert(stats.isFile());
		assertStrictEquals(stats.atime.toISOString(), now.toISOString());
		assertStrictEquals(stats.ctime.toISOString(), now.toISOString());
		assertStrictEquals(stats.mtime.toISOString(), now.toISOString());
	}

	{
		const stats = Result.unwrap(await storage.stats("/path/to"));
		assert(stats.isDirectory());
		assertStrictEquals(stats.atime?.toISOString(), now.toISOString());
		assertStrictEquals(stats.ctime?.toISOString(), now.toISOString());
		assertStrictEquals(stats.mtime?.toISOString(), now.toISOString());
	}

	{
		const stats = Result.unwrap(await storage.stats("/path"));
		assert(stats.isDirectory());
		assertStrictEquals(stats.atime?.toISOString(), now.toISOString());
		assertStrictEquals(stats.ctime?.toISOString(), now.toISOString());
		assertStrictEquals(stats.mtime?.toISOString(), now.toISOString());
	}

	{
		const stats = Result.unwrap(await storage.stats("/"));
		assert(stats.isDirectory());
		assertStrictEquals(stats.atime?.toISOString(), now.toISOString());
		assertStrictEquals(stats.ctime?.toISOString(), now.toISOString());
		assertStrictEquals(stats.mtime?.toISOString(), now.toISOString());
	}
});

Deno.test("Should return correct stats for the root directory", async () => {
	using _ = new FakeTime();

	const store = memoryStore();
	const now = new Date();
	const stats = Result.map(
		await store.stats("/"),
		(a) => omit(a, "isDirectory", "isFile"),
	);
	assertEquals(
		stats,
		Result.ok({
			atime: now,
			btime: now,
			ctime: now,
			mtime: now,
		}),
	);
});

Deno.test("Should get the basename", async () => {
	const store = memoryStore();
	assertEquals(store.basename(), "/");
});
