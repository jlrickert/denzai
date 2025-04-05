import { Backend } from "./backend.ts";
import { memoryStore } from "../store/memory_store.ts";

export function memoryBackend() {
	const root = memoryStore();
	const data = root.child("data");
	const state = root.child("state");
	const config = root.child("config");
	const cache = root.child("cache");
	return new Backend({
		type: "memory",
		env: {
			getHome() {
				return null;
			},
			getCWD() {
				return null;
			},
			getVal(key) {
				return null;
			},
			hasVal(key) {
				return false;
			},
		},
		cache,
		config,
		state,
		data,
	});
}
