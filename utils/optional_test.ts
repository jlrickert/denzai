import { assertEquals } from "@std/assert";
import { assign, bind, bindTo, chain, map, none, some } from "./optional.ts";
import { pipe } from "./funcs.ts";

Deno.test("Optional.map", () => {
	assertEquals(
		map(some(1), (a) => a + a),
		some(2),
	);
	assertEquals(
		map(none, (a) => a + a),
		none,
	);
});

Deno.test("Optional.chain", () => {
	assertEquals(
		chain(some(1), (a) => a + a),
		some(2),
	);
	assertEquals(
		chain(some(1), () => undefined),
		none,
	);
});

Deno.test("Optional do notation", () => {
	assertEquals(
		pipe(
			some(1),
			bindTo("a"),
			bind("b", () => some("b")),
			assign("d", ({ a, b }) => [a, b] as const),
		),
		{ a: 1, b: "b", d: [1, "b"] },
	);
	assertEquals(
		pipe(
			some(1),
			bindTo("a"),
			bind("b", () => none),
			assign("d", ({ a, b }) => [a, b] as const),
		),
		none,
	);
});
