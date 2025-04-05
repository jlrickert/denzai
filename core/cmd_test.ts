import { assertEquals } from "@std/assert";
import { Cmd } from "./cmd.ts";
import { helpCmd } from "./cmd/help.ts";
import type { CmdApi, Ctx } from "./types.ts";
import type { DenzaiErr } from "./error.ts";

const addCmd: CmdApi = {
	name: "add",
	alias: ["a"],
	short: "Add file contents to the index",
	async do(ctx, ...args) {
		return null;
	},
};

const rmCmd: CmdApi = {
	name: "rm",
	short: "Remove files from the working tree and from the index",
};

const gitCmd: CmdApi = {
	name: "git",
	async init(ctx, ...args) {
		return null;
	},
	children: [addCmd, rmCmd, helpCmd],
};

Deno.test("should do the completion", () => {});

Deno.test("should get the help items", async () => {
	const cmd = new Cmd(gitCmd);
	let log = "";
	const print = async (value: string) => {
		log = `${log}${value}`;
	};
	await cmd.runWithArgs(["help"], { print });
	const gitHelpMsg = `
usage: git <command>
	add  ← Add file contents to the index
	rm   ← Remove files from the working tree and from the index
`.trimStart();
	assertEquals(log, gitHelpMsg);
});

Deno.test("Should call init in the expected sequence", async () => {
	type T = { name: string; args: string[] };
	let fnCalls: T[] = [];
	const initFn: (ctx: Ctx, args: string[]) => Promise<DenzaiErr | null> =
		async (ctx, args) => {
			fnCalls.push({
				name: ctx.cmd.name,
				args,
			});
			return null;
		};

	const root = new Cmd({
		name: "a",
		init: initFn,
		children: [
			{ name: "aa", init: initFn },
			{ name: "ab", init: initFn },
			{
				name: "ac",
				init: initFn,
				children: [
					{ name: "aca", init: initFn },
					{ name: "acb", init: initFn },
					{ name: "acc", init: initFn },
					{ name: "acd", init: initFn },
				],
			},
			{ name: "ad", init: initFn },
		],
	});

	fnCalls = [];
	await root.runWithArgs(["ab"]);
	assertEquals(fnCalls, [
		{ name: "a", args: ["ab"] },
		{ name: "ab", args: [] },
	]);

	fnCalls = [];
	await root.runWithArgs(["ac", "acc"]);
	assertEquals(fnCalls, [
		{ name: "a", args: ["ac", "acc"] },
		{ name: "ac", args: ["acc"] },
		{ name: "acc", args: [] },
	]);

	fnCalls = [];
	await root.runWithArgs(["ac", "acc", "arg1", "arg2"]);
	assertEquals(fnCalls, [
		{ name: "a", args: ["ac", "acc", "arg1", "arg2"] },
		{ name: "ac", args: ["acc", "arg1", "arg2"] },
		{ name: "acc", args: ["arg1", "arg2"] },
	]);
});
