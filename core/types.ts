import { Cmd } from "./cmd.ts";
import type { DenzaiErr } from "./error.ts";

/**
 * Defines the structure for a schema that validates argument constraints.
 */
export type Schema = {
	minArgs?: number;
	maxArgs?: number;
	exact?: number;
	regxArgs?: RegExp;
};

/**
 * CmdApi describes the commands. Use [Cmd] to build up a command tree.
 */
export interface CmdApi {
	/** command name */
	name: string;

	/** Shareable variables */
	vars?: Var[];

	alias?: string[];

	// Work for the command itself
	/** Initialize the command */
	init?(ctx: Ctx, args: string[]): Promise<DenzaiErr | null>;

	/** Actually do the work */
	do?(ctx: Ctx, args: string[]): Promise<DenzaiErr | null>;

	// Delegated work
	children?: CmdApi[];

	// Documentation
	version?: string;

	/** Short description (<50 chars) */
	short?: string;

	/** Long description */
	long?: string;

	schema?: Schema;

	completer?: Completer;
	hidden?: boolean;
}

/**
 * Represents a logging function that handles log messages with a specified level and optional context.
 *
 * @param args - An object containing the log message and its metadata.
 * @param args.message - The log message to be recorded.
 * @param args.context - Optional additional context for the log entry.
 * @param args.level - The severity level of the log message.
 *
 * @returns A promise that resolves when the log operation is complete.
 */
export type LogFn = (args: {
	message: string;
	context?: unknown;
	level: "debug" | "info" | "warn" | "trace" | "error";
}) => Promise<void>;

// deno-lint-ignore no-explicit-any
export interface Ctx {
	/**
	 * Indicates whether the current context is a completion context.
	 */
	isComp: boolean;

	/**
	 * parent of selected subcommand. Null if selected command is root command.
	 */
	parent: Cmd | null;

	/**
	 * root command
	 */
	root: Cmd;

	/**
	 * The command being run
	 */
	cmd: Cmd;

	/**
	 * Command path taken
	 */
	path: Cmd[];

	/**
	 * All arguments. passed on the command line
	 */
	args: string[];

	/**
	 * Argument given to the specific command. This doesn't include the subcommands
	 */
	cmdArgs: string[];

	/**
	 * Send output. Typically to stdout.
	 */
	print(value: string): Promise<void>;

	/**
	 * Send output to error stream. Typically, stderr. stderr is sometimes used
	 * as addtional output that doesn't get passed to other command in a shell
	 * pipe.
	 */
	printErr(value: string): Promise<void>;

	/**
	 * Log for debugging purposes
	 */
	log: LogFn;
}

/** Shared data between command instances */
export interface Var {
	key: string;
	value: string;
	env: string;
	short: string;
	persist: string;
}

/**
 * Represents the arguments related to command completion in a shell environment.
 */
export interface CompArgs {
	/**
	 * The index of the current word in the command line. This indicates which
	 * word is currently being completed, allowing the completion function to
	 * provide context-specific suggestions based on the position of the
	 * cursor.
	 */
	cword: number;

	/**
	 * The entire command line as typed by the user. This includes all words
	 * and options, providing the completion function with the full context of
	 * the command being executed.
	 */
	line: string;

	/**
	 * The index of the cursor position in the command line. This helps
	 * determine where the completion is being requested and can be used to
	 * identify the specific word or option that is being completed.
	 */
	point: number;

	/**
	 * An array of arguments passed to the command.
	 *
	 * This property holds the individual arguments provided by the user when
	 * executing a command. Each argument is represented as a string in the
	 * array, allowing for flexible input handling.
	 *
	 * Example:
	 * - For a command like `ku run --verbose arg1 arg2`, the args array
	 *   would contain: ["run", "--verbose", "arg1", "arg2"].
	 */
	args: string[];
}

export interface Completer {
	complete?(ctx: Ctx, args: CompArgs): Promise<string[]>;
	cmdComplete?(ctx: Ctx, args: CompArgs): Promise<string[]>;
}
