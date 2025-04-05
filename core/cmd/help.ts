import type { Cmd } from "../cmd.ts";
import type { CmdApi, Ctx } from "../types.ts";

export const helpCmd: CmdApi = {
	name: "help",
	alias: ["h"],
	vars: [],
	async do(ctx, args) {
		const parent = ctx.parent || ctx.root;
		await ctx.print(`usage: ${parent.name}`);
		if (parent.children.length > 0) {
			await ctx.print(" <command>");
		}
		if (parent.schema.minArgs ?? 0 > 0) {
			await ctx.print(" [<args>]");
		}
		await ctx.print("\n");

		function f(ctx: Ctx, root: Cmd, depth: number): string[] {
			const maxNameLength = root.children.reduce((max, cmd) => {
				return Math.max(max, cmd.name.length);
			}, 0);
			const lines: string[] = [];
			for (const child of root.children) {
				if (child.name == helpCmd.name) {
					continue;
				}
				const line = [];
				line.push(
					`${"\t".repeat(depth)}${child.name.padEnd(maxNameLength)}`,
				);
				if (child.short) {
					line.push(`← ${child.short}`);
				}
				lines.push(line.join(" "));
				lines.push(...f(ctx, child, depth + 1));
			}
			return lines;
		}
		const lines = f(ctx, parent, 1);
		await ctx.print(lines.join("\n"));
		await ctx.print("\n");
		return null;
	},
	completer: {
		async cmdComplete(ctx, ...args) {
			return ctx.cmd.children.reduce((acc, child) => {
				if (child.children.find((a) => a.name === helpCmd.name)) {
					acc.push(child.name);
					return acc;
				}
				return acc;
			}, [] as string[]);
		},
	},
};
