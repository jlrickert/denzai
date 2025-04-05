import { absurd } from "../utils/funcs.ts";
import { BaseErr, type BaseErrCode } from "../utils/mod.ts";

export function isStoreErr(error: unknown): error is StoreErr {
	return error instanceof StoreErr;
}

export type StoreErrCode =
	| BaseErrCode
	| "FILE_NOT_FOUND"
	| "FILE_EXISTS"
	| "NOT_A_FILE"
	| "DIR_NOT_FOUND"
	| "DIR_EXISTS"
	| "NOT_A_DIR"
	| "PATH_NOT_FOUND"
	| "PATH_EXISTS"
	| "PATH_UNAVAILABLE"
	| "UNSUPPORTED_OPERATION"
	| "READ_ONLY"
	| "ACCESS_DENIED"
	| "AUTHENTICATION_FAILED"
	| "NETWORK_ERROR"
	| "API_ERROR"
	| "RATE_LIMIT_ERROR"
	| "CONCURRENT_MODIFICATION"
	| "QUOTA_EXCEEDED"
	| "INSUFFICIENT_SPACE"
	| "INTERNAL";

export class StoreErr extends BaseErr<StoreErrCode> {
	override desc(): string {
		const c = this.code as StoreErrCode;
		switch (c) {
			case "SYNTAX":
				return "A syntax error has occurred.";
			case "SCHEMA":
				return "A schema error has occurred. The data does not conform to the expected schema.";
			case "INVARIANT":
				return "An invariant violation has occurred.";
			case "FILE_NOT_FOUND":
				return "The specified file could not be found.";
			case "FILE_EXISTS":
				return "The specified file already exists.";
			case "NOT_A_FILE":
				return "The specified path is not a file.";
			case "DIR_NOT_FOUND":
				return "The specified directory could not be found.";
			case "DIR_EXISTS":
				return "The specified directory already exists.";
			case "NOT_A_DIR":
				return "The specified path is not a directory.";
			case "PATH_NOT_FOUND":
				return "The specified path could not be found.";
			case "PATH_EXISTS":
				return "The specified path already exists.";
			case "PATH_UNAVAILABLE":
				return "The specified path is currently unavailable.";
			case "UNSUPPORTED_OPERATION":
				return "The operation is not supported.";
			case "READ_ONLY":
				return "The resource is read-only.";
			case "ACCESS_DENIED":
				return "Access to the resource is denied.";
			case "AUTHENTICATION_FAILED":
				return "Authentication has failed.";
			case "NETWORK_ERROR":
				return "A network error has occurred.";
			case "API_ERROR":
				return "An error occurred while calling the API.";
			case "RATE_LIMIT_ERROR":
				return "Rate limit has been exceeded.";
			case "CONCURRENT_MODIFICATION":
				return "The resource has been modified concurrently.";
			case "QUOTA_EXCEEDED":
				return "The quota for the resource has been exceeded.";
			case "INSUFFICIENT_SPACE":
				return "There is insufficient space available.";
			case "INTERNAL":
				return "An internal error has occurred.";
			case "UNKNOWN":
				return "An unknown error has occurred.";
			case "PARSE":
				return "A parse error has occurred. The code could not be interpreted due to invalid syntax.";
			default:
				return absurd(c);
		}
	}
}
