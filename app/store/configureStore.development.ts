import { createStore, applyMiddleware, compose, combineReducers } from 'redux'
import { connectRouter, routerMiddleware } from 'connected-react-router'
import thunk from 'redux-thunk'
import createHistory from 'history/createBrowserHistory'
import promise from 'redux-promise-middleware'

import {samplesReducer, IClientState, fileTreeReducer, dbReducer} from '../controllers'

// export const history = createHistory()
const history = createHistory()

const enhancers = []
const middleware = [thunk, routerMiddleware(history), promise()]

if (process.env.NODE_ENV === 'development') {
    const devToolsExtension = (window as any).__REDUX_DEVTOOLS_EXTENSION__

    if (typeof devToolsExtension === 'function') {
        enhancers.push(devToolsExtension())
    }
}

const composedEnhancers = compose(
    applyMiddleware(...middleware),
    ...enhancers,
)

const rootReducer = combineReducers<IClientState>({
    samples: samplesReducer,
    fileTree: fileTreeReducer,
    database: dbReducer,
    router: connectRouter(history),
})

declare const module: NodeModule & {
    hot?: {
        accept(...args: any[]): any;
    }
}

export = {
    history,
    configureStore() {
        const store = createStore(rootReducer, composedEnhancers);

        if (module.hot) {
            // module.hot.accept('../reducers', () =>
            //     store.replaceReducer(require('../reducers')) // eslint-disable-line global-require
            // );
        }
        // store.dispatch(DBActions.startDatabase())
        return store;
    }
};
