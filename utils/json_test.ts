import { assertEquals, assertObjectMatch } from "@std/assert";
import { parse } from "./json.ts";
import * as R from "./result.ts";
import { Path } from "./mod.ts";

Deno.test("Json parse valid result", async () => {
	const kegdata = await Deno.readTextFile(
		Path.join(import.meta.dirname ?? ".", "testData/keg.json"),
	);
	assertEquals(
		parse(kegdata),
		R.ok({
			updated: "2022-11-26T19:33:24Z",
			kegv: "2023-01",
			title: "A Sample Keg number 1",
			url: "git@github.com:YOU/keg.git",
			creator: "git@github.com:YOU/YOU.git",
			state: "living",
			summary:
				"👋 Hey there! The KEG community welcomes you. This is an initial\nsample `keg` file. It uses a simplified YAML format. (If you know JSON,\nyou know this.) Go ahead and change this summary and anything else you\nlike, but keep in mind the following:\n\n* The updated line MUST be the first line\n* Everything *but* the updated line is optional\n* You can leave the indexes section alone (they are on by default)\n* Change **creator** to the URL for your main keg\n* Change the **url** to the main place to find this keg\n* Change **state** only if you are planning something more formal\n* Keep the **zero node** created to link to for planned content\n\nIf you are a `vim` user you might want to add something like the\nfollowing to your `.vimrc`:\n\n  au bufnewfile,bufRead keg set ft=yaml\n",
			indexes: [
				{
					file: "dex/changes.md",
					summary: "latest changes",
				},
				{
					file: "dex/nodes.tsv",
					summary: "all nodes by id",
				},
				{
					file: "dex/tags",
					summary: "tags index",
				},
			],
		}),
	);
});

Deno.test("Deno parse invalid result", () => {
	const result = parse(`summary:
				invalid
				content`);
	assertObjectMatch(result, { error: { code: "SYNTAX" } });
});
