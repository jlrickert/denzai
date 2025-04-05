import { absurd } from "./funcs.ts";
import { Json, Result } from "./mod.ts";
function getCallerInfo(n: number = 2): string | null {
	const err = new Error();
	const stackLines = err.stack?.split("\n") || [];

	const callerLine = stackLines.length > n ? stackLines[n] : undefined;
	if (!callerLine) {
		return null;
	}
	return callerLine.trim();
}

export type BaseErrCode =
	| "SYNTAX"
	| "SCHEMA"
	| "PARSE"
	| "INVARIANT"
	| "UNKNOWN";

export class BaseErr<Code extends string = BaseErrCode> extends Error {
	override message: string;
	public readonly code: Code;
	public readonly context?: unknown;

	static invariant(
		condition: any,
		message?: string | (() => string),
	): asserts condition {
		if (condition) {
			return;
		}
		let msg: string = "";
		switch (typeof message) {
			case "string": {
				msg = message;
				break;
			}
			case "function": {
				msg = message();
				break;
			}
			default: {
				msg = "Invariant";
				break;
			}
		}

		const stack = getCallerInfo(3);
		throw new BaseErr({
			code: "INVARIANT",
			message: msg,
			context: { stack },
		});
	}

	constructor(options: { code: Code; message?: string; context?: unknown }) {
		super(options.message);
		this.code = options.code;
		this.message = options.message
			? `${options.code}: ${options.message}`
			: options.code;
		this.context = options.context;
	}

	toErr(): Result.Result<never, BaseErr<Code>> {
		return Result.err(this);
	}

	desc(): string {
		const c = this.code as BaseErrCode;
		switch (c) {
			case "SYNTAX":
				return "A syntax error has occurred.";
			case "SCHEMA":
				return "A schema error has occurred. The data does not conform to the expected schema.";
			case "UNKNOWN":
				return "An unknown error has been encountered.";
			case "INVARIANT":
				return "An invariant violation has occurred.";
			case "PARSE":
				return "A parse error has occurred. The code could not be interpreted due to invalid syntax.";
			default:
				return absurd(c);
		}
	}

	stringify(): string {
		return Json.stringify({
			code: this.code,
			message: this.message,
			context: Json.jsonify(this.context),
		});
	}
}
export function invariant(
	condition: any,
	message?: string | (() => string),
): asserts condition {
	return BaseErr.invariant(condition, message);
}
