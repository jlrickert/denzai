import * as StdYaml from "@std/yaml";
import * as Result from "./result.ts";
import { BaseErr } from "./errors.ts";

export function parse<T = unknown>(
	content: string,
	options?: StdYaml.ParseOptions,
): Result.Result<T, BaseErr> {
	return Result.tryCatch(
		() => StdYaml.parse(content, options) as T,
		(error) => {
			return new BaseErr({
				code: "SYNTAX",
				message: (error as SyntaxError).message,
				context: {
					content,
					error,
				},
			});
		},
	);
}

export function stringify(
	data: unknown,
	options?: StdYaml.StringifyOptions,
): string {
	return StdYaml.stringify(data, options);
}
