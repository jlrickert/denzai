import type { DenzaiErr } from "./error.ts";
import { Ok, type Result } from "./funcs.ts";
import { makeCompArgs } from "./mod.ts";
import type { CmdApi, CompArgs, Ctx, LogFn, Schema } from "./types.ts";

export interface RunCmdOptions {
	/**
	 * Enable completion detection
	 */
	detectComp?: boolean;
	print?: (value: string) => Promise<void>;
	printErr?: (value: string) => Promise<void>;
	log?: LogFn;
}

export const defaultPrintFn: Ctx["print"] = async (value: string) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(value);
	await Deno.stdout.write(data);
};

export const defaultPrintErrFn: Ctx["print"] = async (value: string) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(value);
	await Deno.stderr.write(data);
};

export const defaultLogFn: Ctx["log"] = async ({ context, message, level }) => {
	const obj = {
		now: new Date(),
		level,
		message,
		context,
	};
	const value = JSON.stringify(obj);
	const encoder = new TextEncoder();
	const data = encoder.encode(value + "\n");
	await Deno.stdout.write(data);
};

export const nullLogFn: Ctx["log"] = async () => {
	return;
};

type ContextLog = {
	name: string;
	alias: string[];
	schema: Schema;
	children: ContextLog[];
};

function transformCmd(cmd: Cmd): ContextLog {
	return {
		name: cmd.name,
		alias: cmd.alias,
		schema: cmd.schema,
		children: cmd.children.map((a) => transformCmd(a)),
	};
}

function transformContext(ctx: Ctx) {
	return {
		root: transformCmd(ctx.root),
		cmd: transformCmd(ctx.cmd),
		args: ctx.args,
		path: ctx.path.map((a) => transformCmd(a)),
	};
}

export async function defaultCmdComplete(
	ctx: Ctx,
	compArgs: CompArgs,
): Promise<string[]> {
	return ctx.cmd.children.map((a) => a.name);
}

export async function defaultComplete(
	ctx: Ctx,
	compArgs: CompArgs,
): Promise<string[]> {
	return [];
}

export interface BashCompArgsOptions {
	/**
	 * Removes the root command and adjusts the values. Useful in some cases.
	 * An example is during testing as the root command is not known.
	 */
	stripCmd?: boolean;
}
export function bashCompArgs(options?: BashCompArgsOptions): CompArgs | null {
	const cword = Number(Deno.env.get("COMP_CWORD") ?? null);
	const line = Deno.env.get("COMP_LINE") ?? null;
	const point = Number(Deno.env.get("COMP_POINT") ?? null);
	if (cword === null || line == null || point === null) {
		return null;
	}
	const args = line.split(/\s+/);
	const stripCmd = options?.stripCmd ?? true;
	if (stripCmd) {
		const word = args[0];
		return {
			cword: cword - 1,
			line: line.slice((word?.length ?? 0) + 1),
			args: args.slice(1, args.length),
			point: point - ((word?.length ?? 0) + 1),
		};
	}
	return { cword, line, point, args };
}

export class Cmd {
	static detectCompletion(): boolean {
		const line = Deno.env.get("COMP_LINE");
		if (line === undefined) {
			return false;
		}
		if (line.length > 0) {
			return true;
		}
		return true;
	}

	public name: string = "";
	public alias: string[] = [];
	public children: Cmd[] = [];
	public long: string | null = null;
	public short: string | null = null;
	public schema: Schema = {};

	constructor(private api: CmdApi) {
		this.updateApi(api);
	}

	/**
	 * Init the command. This gets called depending on the path taken taken.
	 * May modify itself and its childrent to change the potential path
	 */
	async init(ctx: Ctx, args: string[]): Promise<DenzaiErr | null> {
		if (this.api.init) {
			await ctx.log({
				level: "trace",
				message: `Running init for ${this.name}`,
				context: transformContext(ctx),
			});
			return this.api.init(ctx, args);
		}
		await ctx.log({
			level: "trace",
			message: `No init for ${this.name}`,
			context: transformContext(ctx),
		});
		return null;
	}

	/**
	 * Runs the command with the arguments provided
	 */
	async do(ctx: Ctx, args: string[]): Promise<DenzaiErr | null> {
		const doFn = this.api.do;
		if (doFn) {
			await ctx.log({
				level: "trace",
				message: `Running command for ${this.name}`,
				context: transformContext(ctx),
			});
			return doFn(ctx, args);
		}
		await ctx.log({
			level: "trace",
			message: `No command for ${this.name}. Nothing to do`,
			context: transformContext(ctx),
		});
		return null;
	}

	async completion(
		ctx: Ctx,
		args: CompArgs,
	): Promise<Result<string[], DenzaiErr>> {
		const cmdCmp = ctx.cmd.api.completer?.cmdComplete ?? defaultCmdComplete;
		const cmp = ctx.cmd.api.completer?.complete ?? defaultComplete;
		const cmdComps = await cmdCmp(ctx, args);
		const argComps = await cmp(ctx, args);
		return Ok([...cmdComps, ...argComps]);
	}

	/**
	 * Updates the API properties and children of the command with the provided
	 * partial CmdApi object.
	 *
	 * This method iterates over the keys of the input api object and updates
	 * the corresponding properties in the current command's API. It also
	 * updates the command's children, name, alias, long description, short
	 * description, and schema based on the provided api object.
	 */
	updateApi(
		api: Partial<Omit<CmdApi, "children"> & { children: (CmdApi | Cmd)[] }>,
	): void {
		for (const key in api) {
			// deno-lint-ignore no-prototype-builtins
			if (api.hasOwnProperty(key)) {
				// @ts-ignore stupid javascript crap
				const attr = api[key];
				// @ts-ignore stupid javascript crap
				this.api[key] = attr;
			}
		}
		if (api.children) {
			this.children.length = 0;
			for (const child of api.children) {
				const cmd = child instanceof Cmd ? child : new Cmd(child);
				this.children.push(cmd);
			}
		}
		this.name = this.api.name;
		this.alias = this.api.alias ?? [];
		this.long = this.api.long ?? "";
		this.short = this.api.short ?? "";
		this.schema = this.api.schema ?? {};
		return;
	}

	/**
	 * High level command to run this command. Determines wether to run the
	 * program or run completions based on the environment and arguments.
	 */
	async run(options?: RunCmdOptions): Promise<DenzaiErr | null> {
		const detectComp = options?.detectComp ?? true;
		const compArgs = detectComp ? bashCompArgs({ stripCmd: true }) : null;
		if (compArgs) {
			return await this.runCompletions(compArgs);
		}
		return this.runWithArgs(Deno.args, options);
	}

	/**
	 * Run the completions. Don't include the root command as there are some
	 * cases where it cannot be known. Ensure `stripCmd` is true on
	 * `bashCompArgs` when getting completion enformation from the environment.
	 */
	async runCompletions(
		args: CompArgs,
		options?: RunCmdOptions,
	): Promise<DenzaiErr | null> {
		const ctx = await this.buildContext(args, options);
		const res = await this.completion(
			ctx,
			makeCompArgs({
				line: ctx.cmdArgs.join(" "),
				point: ctx.cmdArgs.length,
			}),
		);
		if (!res.success) {
			return res.error;
		}
		await ctx.print(res.value.join(" "));
		return null;
	}

	/**
	 * Runs the command with the given arguments.
	 */
	async runWithArgs(
		args: string[],
		options?: RunCmdOptions,
	): Promise<DenzaiErr | null> {
		const ctx = await this.buildContext(args, options);
		const { regxArgs, maxArgs, minArgs, exact } = ctx.cmd.schema;
		if (exact && ctx.cmdArgs.length !== exact) {
			return null;
		}
		if (minArgs && !(ctx.cmdArgs.length >= minArgs)) {
			return null;
		}
		if (maxArgs && !(maxArgs <= ctx.cmdArgs.length)) {
			return null;
		}
		if (regxArgs && !regxArgs.test(ctx.cmdArgs.join(" "))) {
			return null;
		}

		return await ctx.cmd.do(ctx, ctx.cmdArgs);
	}

	/**
	 * Find the next subcommand on the tree
	 */
	private nextSubcommand(ctx: Ctx): Cmd | null {
		const [cmdName] = ctx.cmdArgs;
		if (cmdName === undefined) {
			return null;
		}

		for (const child of ctx.cmd.children ?? []) {
			if (
				child.name === cmdName ||
				(cmdName.length > 0 && child.name.startsWith(cmdName))
			) {
				return child;
			}
		}
		return null;
	}

	/**
	 * builds the next item in the tree if it exists
	 */
	private async processNext(ctx: Ctx): Promise<Ctx> {
		await ctx.cmd.init(ctx, ctx.cmdArgs);
		const subCmd = this.nextSubcommand(ctx);
		if (subCmd !== null) {
			const [, ...subCmdArgs] = ctx.cmdArgs;
			ctx.parent = ctx.cmd;
			ctx.cmdArgs = subCmdArgs;
			ctx.cmd = subCmd;
			ctx.path.push(subCmd);
			await this.processNext(ctx);
		}
		return ctx;
	}

	/**
	 * Builds a command context based on the provided arguments and options.
	 * Calls the init function as it follows the path.
	 */
	private async buildContext(
		args: CompArgs | string[],
		options?: RunCmdOptions,
	): Promise<Ctx> {
		const print = options?.print ?? defaultPrintFn;
		const printErr = options?.printErr ?? defaultPrintErrFn;
		const log: LogFn = options?.log ?? nullLogFn;

		const isComp = !Array.isArray(args);
		const ctxArgs = Array.isArray(args) ? [...args] : [...args.args]; // Creating a copy as context is mutated
		const ctx: Ctx = {
			isComp,
			root: this,
			parent: null,
			args: ctxArgs,
			cmdArgs: ctxArgs,
			cmd: this,
			path: [this],
			print,
			printErr,
			log,
		};
		await this.processNext(ctx);
		return ctx;
	}
}
