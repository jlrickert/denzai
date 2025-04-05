import { assertEquals } from "@std/assert";
import {
	apPar,
	apSeq,
	assign,
	bind,
	bindTo,
	chain,
	map,
	of,
} from "./future.ts";
import { pipe } from "./funcs.ts";

Deno.test("Future.map", async () => {
	assertEquals(await map(of(1), (a) => a + a), 2);
});

Deno.test("Future.chain", async () => {
	assertEquals(await chain(of(1), (a) => of(a + a)), 2);
});

Deno.test("Future apPar", async () => {
	const f = (s: string) => s.length;
	assertEquals(await pipe(apPar(of(f), of("hello"))), 5);
});

Deno.test("Future apSeq", async () => {
	const f = (s: string) => s.length;
	assertEquals(await pipe(apSeq(of(f), of("hello"))), 5);
});

Deno.test("Future do notation", async () => {
	assertEquals(
		await pipe(
			of(1),
			bindTo("a"),
			bind("b", () => of("b")),
			assign("d", async ({ a, b }) => [a, b] as const),
		),
		{ a: 1, b: "b", d: [1, "b"] },
	);
});
