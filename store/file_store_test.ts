import { assertAlmostEquals, assertEquals } from "@std/assert";
import { memoryStore } from "./memory_store.ts";
import { tempFsStore } from "./file_store.ts";
import { expectSameBehavior } from "./testing.ts";

Deno.test("Local File Store", async () => {
	await using storage = await tempFsStore();
	const memory = memoryStore();

	await expectSameBehavior(memory, storage, {
		assertEquals,
		assertAlmostEquals,
	});
});
