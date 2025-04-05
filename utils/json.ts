import * as StdJson from "@std/jsonc";
import { Result } from "./mod.ts";
import { stringify as stringifyDate } from "./traits.ts";
import { BaseErr } from "./errors.ts";

export type JsonObject = { [key: string]: Json };
export type JsonArray = Json[];
export type JsonBoolean = boolean;
export type JsonNumber = number;
export type JsonNull = null;
export type JsonString = string;

export type Json =
	| JsonNull
	| JsonNumber
	| JsonBoolean
	| JsonString
	| JsonArray
	| JsonObject;

export function isBoolean(json: any): json is JsonBoolean {
	return typeof json === "boolean";
}

export function isJsonNull(json: any): json is JsonNull {
	return json === null;
}

export function isJsonNumber(json: any): json is JsonNull {
	return typeof json === "number";
}

export function isJsonString(json: any): json is JsonNull {
	return typeof json === "string";
}

export function isJson(json: any): json is Json {
	switch (typeof json) {
		case "string": {
			return true;
		}
		case "number": {
			return true;
		}
		case "boolean": {
			return true;
		}
	}
	if (isJsonNull(json)) {
		return true;
	}
	if (isJsonArray(json)) {
		return true;
	}
	if (isJsonObject(json)) {
		return true;
	}
	return false;
}

export function isJsonObject(json: any): json is JsonObject {
	const ok = typeof json === "object" && json !== null &&
		!Array.isArray(json);
	if (!ok) {
		return false;
	}
	for (const key in json) {
		if (!json.hasOwnProperty(key)) {
			continue;
		}
		if (!isJson(json[key])) {
			return false;
		}
	}
	return true;
}

export function isJsonArray(json: any) {
	if (!Array.isArray(json)) {
		return true;
	}
	return json.every((item) => isJson(item));
}

export function parse<T = unknown>(content: string): Result.Result<T, BaseErr> {
	return Result.tryCatch(
		() => StdJson.parse(content) as T,
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

export type StringifyOptions = {
	space?: string;
};

export function stringify(json: Json, options?: StringifyOptions): string {
	return JSON.stringify(json, undefined, options?.space);
}

/**
 * Makes the best attempt at converting a value to a JSON-compatible structure.
 */
export function jsonify(data: any): Json {
	if (data === null) {
		return null;
	}
	if (typeof data === "boolean") {
		return data;
	}
	if (typeof data === "number") {
		return data;
	}
	if (typeof data === "string") {
		return data;
	}
	if (Array.isArray(data)) {
		return data.map(jsonify);
	}
	if (typeof data === "object") {
		const obj: JsonObject = {};
		for (const key in data) {
			if (!data.hasOwnProperty(key) || data[key] === undefined) {
				continue;
			}
			obj[key] = jsonify(data[key]);
		}
		return obj;
	}
	if (data instanceof Date) {
		return stringifyDate(data);
	}
	if ("toJson" in data) {
		return data.toJson();
	}
	return null;
}
