import type { Store } from "../store/store.ts";
import { detectEnv } from "../utils/futils.ts";
import type { Future } from "../utils/mod.ts";
import { memoryBackend } from "./memory.ts";

export interface BackendEnv {
	/**
	 * Retrieves the home directory path for the backend environment.
	 *
	 * @returns {string | null} The home directory path as a string or null if not set.
	 */
	getHome(): string | null;
	getCWD(): string | null;
	getVal(key: string): string | null;
	hasVal(key: string): boolean;
}

/**
 * Interface for custom backend implementations.
 *
 * This interface defines the API for interacting with various backend environments,
 * normalizing the differences between them. It provides a consistent way to access
 * backend functionalities, regardless of the underlying implementation.
 */
export interface BackendApi {
	/**
	 * Specifies the type of backend being used.
	 */
	type: string;

	/**
	 * Represents the backend environment configuration.
	 *
	 * This property holds an instance of the BackendEnv interface, which provides methods
	 * to access environment-specific settings and configurations.
	 */
	env: BackendEnv;

	/**
	 * Data file system. This is safe to synchronize across systems
	 */
	data: Store;

	/**
	 * Configuration file system. This is safe to synchronize across systems
	 */
	config: Store;

	/**
	 * Device specic data. Not safe to synchronize
	 */
	state: Store;

	/**
	 * Cache file system. Non essentail data. Typically data that may be
	 * regenerated
	 */
	cache: Store;
}

/**
 * Represents a backend class that derives its API from the provided configuration.
 *
 * This class is responsible for managing interactions with the backend environment,
 * utilizing the API defined by the provided configuration. It normalizes the behavior
 * across different backend implementations, ensuring a consistent interface for clients.
 */
export class Backend {
	/**
	 * Detects the environment in which the code is running, determining
	 * whether it is being executed in a user's system (Node.js) or in a
	 * browser context. This method returns a string indicating the environment
	 * type, which can be useful for conditional logic based on the execution
	 * context.
	 *
	 * @returns A string indicating the environment type ("node" or "browser").
	 */
	static async detect(): Future.Future<Backend | null> {
		const env = detectEnv();
		if (["deno", "node"].includes(env)) {
			const { fileBackend } = await import("./file.ts");
			return fileBackend();
		}
		// if (env === 'browser') {
		// 	const { webBackend } = await import('./web.ts')
		// 	return webBackend()
		// }
		return memoryBackend();
	}

	static makeApi(api: BackendApi): BackendApi {
		return api;
	}

	constructor(private api: BackendApi) {}

	/**
	 * Retrieves the type of backend being used.
	 */
	get type(): string {
		return this.api.type;
	}

	/**
	 * Retrieves the environmental information from the backend API.
	 *
	 * Provides access to various environmental configurations and settings
	 */
	get env(): BackendEnv {
		return this.api.env;
	}

	/**
	 * Retrieves the cache store from the backend API.
	 *
	 * Cache data held by the application, which is used to temporarily store
	 * frequently accessed information for improved performance.
	 */
	get cache(): Store {
		return this.api.cache;
	}

	/**
	 * Retrieves the configuration store from the backend API.
	 *
	 * Configuration data related to the application's settings and
	 * preferences, allowing access to the stored configuration values.
	 */
	get config(): Store {
		return this.api.config;
	}

	/**
	 * Retrieves the data store from the backend API.
	 *
	 * Data held by the application, which may be shared between different
	 * systems or used exclusively within the application.
	 */
	get data(): Store {
		return this.api.data;
	}

	/**
	 * Retrieves store for state. Things such as logs are typically stored
	 * here.
	 */
	get state(): Store {
		return this.api.state;
	}
}
