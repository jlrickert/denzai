import { assertEquals } from "@std/assert";
import { assign, bind, bindTo, chain, err, map, ok } from "./future_result.ts";
import { pipe } from "./funcs.ts";
import { Result } from "./mod.ts";

Deno.test("FutureResult.map", async () => {
	assertEquals(await map(ok(1), (a) => a + a), Result.ok(2));
});

Deno.test("FutureResult.chain", async () => {
	assertEquals(await chain(ok(1), (a) => ok(a + a)), Result.ok(2));
});

Deno.test("FutureResult do notation", async () => {
	assertEquals(
		await pipe(
			ok(5),
			bindTo("a"),
			bind("b", () => ok(6)),
			assign("c", ({ a, b }) => ok(a + b)),
		),
		await ok({ a: 5, b: 6, c: 11 }),
	);

	assertEquals(
		await pipe(
			ok(5),
			bindTo("a"),
			bind("b", () => err("invalid value" as const)),
			assign("c", ({ a, b }) => ok(a + b)),
		),
		await err("invalid value" as const),
	);
	assertEquals(
		await pipe(
			err("invalid value" as const),
			bindTo("a"),
			bind("b", () => ok(6)),
			assign("c", ({ a, b }) => ok(a + b)),
		),
		await err("invalid value" as const),
	);
});
