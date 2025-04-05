import { assertAlmostEquals, assertEquals } from "@std/assert";
import { expectSameBehavior, mockLocalStorage } from "./testing.ts";
import { webStore } from "./web_store.ts";
import { memoryStore } from "./memory_store.ts";

Deno.test("Web store", async () => {
	const storage = webStore(mockLocalStorage());
	const memory = memoryStore();

	await expectSameBehavior(memory, storage, {
		assertEquals,
		assertAlmostEquals,
	});
});
