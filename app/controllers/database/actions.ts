import {
  dbActions,
  IConnectDatabase,
  IConnectDatabaseFulfilled, IGetEnzymeDistribution, IGetEnzymeDistributionPending,
  IGetImports,
  IGetSamples, IGetSamplesPending, IGetSamplesPendingDone,
  IGetTaxonomiesForImport, IGetTaxonomiesForImportPending, IGetTaxonomiesForImportPendingDone,
} from './interfaces'
import {Connection} from 'typeorm'
import {ThunkAction, ThunkDispatch} from 'redux-thunk'
import {AnyAction} from 'redux'
import {getDBConnection} from './selectors'
import {IClientState} from '../index'
import {getEnzymeDistributionQuery, getSamplesQuery, getTaxonomiesAndCountQuery} from './queries'
import {SamplesActions} from '../samples'
import {ISampleFilter} from 'samples'

console.log('window: ', window)
const orm = (window as any).typeorm

export class DBActions {
  static connectDatabase(): IConnectDatabase {
    return {
      type: dbActions.connectDatabase, payload: orm.createConnection().then(async (connection: Connection) => {
        return connection
      }).catch((error: any) => console.log('wtf?', error))
    }
  }
  static connectDatabaseFulfilled(connection: Connection): IConnectDatabaseFulfilled {
    return {type: dbActions.connectDatabaseFulfilled, payload: connection}
  }

  static getTaxonomiesForImport(connection: Connection, recordId: number, filter?: ISampleFilter): IGetTaxonomiesForImport {
    return {type: dbActions.getTaxonomiesForImport, payload: getTaxonomiesAndCountQuery(connection, recordId, filter)}
  }
  static getTaxonomiesForImportPending(payload: any): IGetTaxonomiesForImportPending {
    return {type: dbActions.getTaxonomiesForImportPending, taxonomiesPending: true}
  }
  static getTaxonomiesForImportPendingDone(): IGetTaxonomiesForImportPendingDone {
    return {type: dbActions.getTaxonomiesForImportPendingDone, taxonomiesPending: false}
  }

  static getEnzymeDistribution(connection: Connection, recordId: number, taxonomyId?: number[], filter?: ISampleFilter): IGetEnzymeDistribution {
    return {type: dbActions.getEnzymeDistribution, payload: getEnzymeDistributionQuery(connection, recordId, taxonomyId, filter)}
  }
  static getEnzymeDistributionPending(payload: any): IGetEnzymeDistributionPending {
    return {type: dbActions.getEnzymeDistributionPending, enzymeDistributionPending: true}
  }

  static getSamples(connection: Connection, recordId: number, taxonomyId?: number[], filter?: ISampleFilter): IGetSamples {
    return {type: dbActions.getSamples, payload: getSamplesQuery(connection, recordId, taxonomyId, filter)}
  }
  // TODO: Maybe combine both cases
  static getSamplesPending(payload: any): IGetSamplesPending {
    return {type: dbActions.getSamplesPending, samplesPending: true}
  }
  static getSamplesPendingDone(): IGetSamplesPendingDone {
    return {type: dbActions.getSamplesPendingDone, samplesPending: false}
  }

  static getImports(connection: Connection): IGetImports {
    return {type: dbActions.getImports, payload: connection.getRepository('import_record').find()}
  }

  static startDatabase(): ThunkAction<Promise<void>, {}, IClientState, AnyAction> {
    return async (dispatch: ThunkDispatch<{}, {}, AnyAction>, getState: () => IClientState): Promise<void> => {
      return new Promise<void>((resolve) => {
        let connection: (Connection | undefined) = getDBConnection(getState())
        if (!connection) {
          dispatch(DBActions.connectDatabase())
        }
        setTimeout(() => {
          connection = getDBConnection(getState())
          if (connection) {
            dispatch(DBActions.getImports(connection))
            resolve()
          }
        }, 2000)
      })
    }
  }

  static getImportData(recordId: number): ThunkAction<Promise<void>, {}, IClientState, AnyAction> {
    return async (dispatch: ThunkDispatch<{}, {}, AnyAction>, getState: () => IClientState): Promise<void> => {
      return new Promise<void>(resolve => {
        let connection: Connection | undefined = getDBConnection(getState())
        if (connection) {
          Promise.all([
            dispatch(DBActions.getTaxonomiesForImport(connection, recordId)),
            dispatch(DBActions.getEnzymeDistribution(connection, recordId)),
            dispatch(DBActions.getSamples(connection, recordId)),
            dispatch(SamplesActions.setImportedRecord(recordId)),
          ]).then(() =>
              Promise.all([dispatch(DBActions.setImportDataFinished())]).then(() => resolve()))
        } else {
          Promise.all([DBActions.setImportDataFinished()]).then(() => resolve())
        }
      })
    }
  }

  static setImportDataFinished(): ThunkAction<Promise<void>, {}, IClientState, AnyAction> {
    return async (dispatch: ThunkDispatch<{}, {}, AnyAction>, getState: () => IClientState): Promise<void> => {
      return new Promise<void>(resolve => {
        Promise.all([
          dispatch(DBActions.getSamplesPendingDone()),
          dispatch(DBActions.getTaxonomiesForImportPendingDone()),
        ]).then(() => resolve())
      })
    }
  }

  static refreshImports(): ThunkAction<Promise<void>, {}, IClientState, AnyAction> {
    return async (dispatch: ThunkDispatch<{}, {}, AnyAction>, getState: () => IClientState): Promise<void> => {
      return new Promise<void>(resolve => {
        let connection: Connection | undefined = getDBConnection(getState())
        if (connection) {
          Promise.all([
            dispatch(DBActions.getImports(connection)),
          ]).then(() => resolve())
        } else {
          resolve()
        }
      })
    }
  }
}