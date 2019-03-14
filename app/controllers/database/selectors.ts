import { createSelector } from 'reselect'
import {IDBState} from './interfaces'
import { IClientState } from '..'

const getDBState = (state: IClientState) => state.database

export const getDBConnection = createSelector(
  getDBState,
  (state: IDBState) => state.connection
)

export const getSamplesStatePending = createSelector(
  getDBState,
  (state: IDBState) => state.samplesPending,
)

export const getTaxonomiesStatePending = createSelector(
  getDBState,
  (state: IDBState) => state.taxonomiesPending,
)