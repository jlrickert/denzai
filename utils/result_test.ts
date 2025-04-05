import { assertEquals } from "@std/assert/equals";
import { assign, bind, bindTo, chain, err, map, ok } from "./result.ts";
import { pipe } from "./funcs.ts";

Deno.test("Result.map", () => {
	assertEquals(
		pipe(
			ok(5),
			map((a) => a + a),
		),
		ok(10),
	);
	assertEquals(
		pipe(
			err("error value"),
			map((a) => a + a),
		),
		err("error value"),
	);
});

Deno.test("Result.chain", () => {
	assertEquals(
		pipe(
			ok(5),
			chain((a) => ok(a + a)),
		),
		ok(10),
	);
	assertEquals(
		pipe(
			err("error value"),
			map((a) => a + a),
		),
		err("error value"),
	);
});

Deno.test("Result do notation", () => {
	assertEquals(
		pipe(
			ok(5),
			bindTo("a"),
			bind("b", () => ok(6)),
			assign("c", ({ a, b }) => ok(a + b)),
		),
		ok({ a: 5, b: 6, c: 11 }),
	);

	assertEquals(
		pipe(
			ok(5),
			bindTo("a"),
			bind("b", () => err("invalid value" as const)),
			assign("c", ({ a, b }) => ok(a + b)),
		),
		err("invalid value" as const),
	);
	assertEquals(
		pipe(
			err("invalid value" as const),
			bindTo("a"),
			bind("b", () => ok(6)),
			assign("c", ({ a, b }) => ok(a + b)),
		),
		err("invalid value" as const),
	);
});
