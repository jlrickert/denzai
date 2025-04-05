import { pick } from "../utils/funcs.ts";
import { type Future, Result } from "../utils/mod.ts";
import { isStoreErr, type StoreErr } from "./errors.ts";
import type { Store } from "./store.ts";

/**
 * Creates a mock implementation of the [Storage] interface, simulating local
 * storage behavior for testing purposes.
 *
 * @returns A mock [Storage] object with the standard local storage methods.
 */
export function mockLocalStorage(): Storage {
	let data: Record<string, string> = {};
	const index: string[] = [];
	return {
		removeItem(key) {
			delete data[key];
			const i = index.indexOf(key);
			delete index[i];
		},
		get length() {
			return index.length;
		},
		setItem(key, value) {
			data[key] = value;
		},
		getItem(key) {
			return data[key] ?? null;
		},
		clear() {
			data = {};
		},
		key(i) {
			return index[i] ?? null;
		},
	};
}

/**
 * Compares the behavior of two [Store] implementations, by executing the same
 * commands and validating the results. This asynchronous function uses the
 * provided parameters to perform assertions, including checking if the
 * modified, accessed, and birth times of entries are roughly the same, as well
 * as ensuring that errors from both stores match in scope, name, and context
 * if they occur.
 *
 * Examples:
 *
 * 1. Comparing two in-memory stores:
 *    import { assertAlmostEquals, assertEquals } from "@std/assert";
 *    const storeA = memoryStore();
 *    const storeB = memoryStore();
 *    await expectSameBehavior(storeA, storeB, {
 *        assertEquals,
 *        assertAlmostEquals,
 *    });
 *
 * @param storeA - The first store to compare.
 * @param storeB - The second store to compare.
 * @param params - An object containing assertion methods.
 * @returns Resolves when the comparison is complete.
 */
export async function expectSameBehavior(
	storeA: Store,
	storeB: Store,
	params: {
		assertEquals: <T>(actual: T, expected: T, msg?: string) => void;
		assertAlmostEquals(
			actual: number,
			expected: number,
			tolerance?: number,
			msg?: string,
		): void;
	},
): Future.Future<void> {
	const { assertAlmostEquals, assertEquals } = params;
	// Check if the same command is the same between node storage and memory storage
	const check = async <
		K extends keyof Omit<Store, "pwd" | "uri" | "storeType" | "jail">,
	>(
		key: K,
		...args: Parameters<Store[K]>
	) => {
		const a = (await (storeA[key] as any)(...args)) as any;
		const b = (await (storeB[key] as any)(...args)) as any;

		if (Result.isOk(a) && Result.isOk(b) && key === "stats") {
			const _a = a.value as any;
			const _b = b.value as any;
			// Assuming Api will be less than 1 second to update
			assertAlmostEquals(
				new Date(_a.mtime).getTime(),
				new Date(_b.mtime).getTime(),
				100,
				"Expect modified time to be roughly the same",
			);
			assertAlmostEquals(
				new Date(_a.atime).getTime(),
				new Date(_b.atime).getTime(),
				100,
				"Expect access time to be roughly the same",
			);
			assertAlmostEquals(
				new Date(_a.btime).getTime(),
				new Date(_b.btime).getTime(),
				100,
				"Expect birth time to be roughly the same",
			);
			// file system doesn't always support ctime
			// expect(diffDate(a.ctime, b.ctime)).toBeLessThan(1000);
			return;
		}
		if (Result.isErr(a) && Result.isErr(b)) {
			const _a = a.error as StoreErr;
			const _b = b.error as StoreErr;
			assertEquals(_a.name, _b.name);
			assertEquals((_a.context as any).path, (_b.context as any).path);
		} else if (isStoreErr(a) && isStoreErr(b)) {
			assertEquals(pick(a, "code", "name"), pick(b, "code", "name"));
		} else {
			assertEquals(a, b);
		}
	};

	await check("utimes", "a", { mtime: new Date() });
	await check("write", "path/to/example", "Example");
	await check("read", "path/to/example");
	await check("write", "/another/path/to/example", "example");
	await check("read", "/another/path/to/example");
	await check("write", "another/path/to/example", "# Example");
	await check("read", "another/path/to/example");
	await check("stats", "path/to/example");
	await check("stats", "/another/path/to/example");
	await check("stats", "another/path/to/example");
	await check("write", "a/a", "Example");
	await check("write", "a/b", "Example");
	await check("write", "a/c", "Example");
	await check("write", "b/a", "Example");
	await check("write", "b/b", "Example");
	await check("write", "b/c", "Example");
	await check("write", "c/a", "Example");
	await check("write", "c/b", "Example");
	await check("write", "c/c", "Example");
	await check("readdir", "a");
	await check("readdir", "b");
	await check("readdir", "c");
}
