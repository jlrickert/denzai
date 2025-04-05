// import { make } from './Backend.ts';
// import { FutureResult, Optional } from '../Utils/index.ts';
// import { BackendError } from '../Data/index.ts';
// import { WebStore } from '../Store/index.ts';
//
// export function webBackend() {
// 	const store = WebStore.webStore({ uri: 'knut' });
// 	const cache = store.child('cache');
// 	const data = store.child('data');
// 	const state = store.child('state');
// 	const config = store.child('config');
// 	return make({
// 		state,
// 		data,
// 		config,
// 		cache,
// 		loader: ({ uri, alias, knutConfig: config }) => {
// 			const kegConfig = config.getKeg(alias);
// 			if (Optional.isNone(kegConfig)) {
// 				return FutureResult.err(
// 					BackendError.loaderError({
// 						uri,
// 						config,
// 						message: `Keg alias "${alias}" doesn't exist`,
// 					}),
// 				);
// 			}
// 			const storage = WebStore.webStore({ uri: 'knut-kegs' }).child(
// 				kegConfig.url,
// 			);
// 			return FutureResult.ok(storage);
// 		},
// 	});
// }
