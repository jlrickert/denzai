export type DenzaiCode =
	| "EXE_NOT_FOUND"
	| "FILE_NOT_FOUND"
	| "PARENT_EXPECTED"
	| "INVARIANT";

function getCallerInfo(n: number = 2): string | null {
	const err = new Error();
	const stackLines = err.stack?.split("\n") || [];

	const callerLine = stackLines.length > n ? stackLines[n] : undefined;
	if (!callerLine) {
		return null;
	}
	return callerLine.trim();
}

export function absurd<A>(_: never): A {
	throw new Error("Called `absurd` function which should be uncallable");
}

export class DenzaiErr extends Error {
	override message: string;
	public readonly code: string;
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
		throw new DenzaiErr({
			code: "INVARIANT",
			message: msg,
			context: { stack },
		});
	}

	constructor(
		options: { code: DenzaiCode; message?: string; context?: unknown },
	) {
		super(options.message);
		this.code = options.code;
		this.message = options.message
			? `${options.code}: ${options.message}`
			: options.code;
		this.context = options.context;
	}
}
