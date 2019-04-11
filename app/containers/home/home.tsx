import * as React from 'react'
import {push} from 'connected-react-router'
import {AnyAction, bindActionCreators, Dispatch} from 'redux'
import {connect} from 'react-redux'
import {withRouter, RouteComponentProps} from 'react-router'
import {IClientState} from '../../controllers'
import {Button, Popover, Position, ButtonGroup, Spinner, Icon, Tag} from '@blueprintjs/core'
import {
  getImportRecords,
  IImportRecord,
  SamplesActions,
  getSamples,
  getDomain,
  getImportRecordsState,
  getBacterialEnzymeTypes,
  getArchaealEnzymeTypes,
  getBins,
  getSelectedBin,
  getBinView,
  getTaxonomiesMap,
  getSelectedTaxonomy,
  getExcludedTaxonomies, getActiveRecord, getTotalLength,
} from '../../controllers/samples'
import {DBActions, getSamplesStatePending} from '../../controllers/database'
import {Connection} from 'typeorm'
import {ThunkAction} from 'redux-thunk'
import {IBin, IDomain} from 'samples'
import {SampleMenu} from '../../components/sampleMenu'
import {BinMenu} from '../../components/binMenu'
import {Bin} from '../../db/entities/Bin'
import {UBinPlotsWrappers} from '../../components/uBinPlotsWrappers'
import {Taxonomy} from '../../db/entities/Taxonomy'
import {IValueMap} from 'common'
import {ResetMenu} from '../../components/resetMenu'
import {BinNaming} from '../../components/binNaming'

interface IProps extends RouteComponentProps {
}

interface IPropsFromState {
  connection: Connection | undefined
  importRecords: IImportRecord[]
  taxonomiesMap: IValueMap<Taxonomy>
  archaealEnzymeTypes: string[]
  bacterialEnzymeTypes: string[]
  samples: any[]
  domain?: IDomain
  importRecordsState: {pending: boolean, loaded: boolean}
  samplesPending: boolean
  bins: Bin[]
  binView: boolean
  activeRecord?: IImportRecord
  selectedBin?: IBin
  selectedTaxonomy?: Taxonomy
  excludedTaxonomies: Taxonomy[]
  totalLength: number
}

interface IActionsFromState {
  changePage(page: string): void
  startDb(): void
  getImportData(recordId: number): ThunkAction<Promise<void>, {}, IClientState, AnyAction>
  refreshImports(): ThunkAction<Promise<void>, {}, IClientState, AnyAction>
  updateDomain(domain: IDomain): ThunkAction<Promise<void>, {}, IClientState, AnyAction>
  setDomain(domain: IDomain): void
  updateDomainX(domain: [number, number]): void
  updateDomainY(domain: [number, number]): void
  updateBinView(isActive: boolean): void
  setSelectedBin(bin: Bin): void
  setSelectedTaxonomy(taxonomy: Taxonomy): void
  addExcludedTaxonomy(taxonomy: Taxonomy): void
  resetFilters(): void
  resetGC(): void
  resetCoverage(): void
  resetTaxonomies(): void
  resetBin(): void
  setConsensus(consensus: Taxonomy): void
  setGCAverage(avg: number): void
  setCoverageAverage(avg: number): void
  setTotalLength(length: number): void
}

const homeStyle = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'left',
  margin: '0',
  marginTop: '64px',
} as React.CSSProperties

type TProps = IProps & IPropsFromState & IActionsFromState

class CHome extends React.Component<TProps> {

  public componentDidMount(): void {
    this.props.refreshImports()
  }

  private toggleBinView(): void {
    this.props.updateBinView(!this.props.binView)
  }

  render(): JSX.Element {
    let { samples, samplesPending, taxonomiesMap, domain, archaealEnzymeTypes, bacterialEnzymeTypes, excludedTaxonomies,
          setSelectedTaxonomy, updateDomain, updateDomainX, updateDomainY, connection, importRecords, addExcludedTaxonomy, setConsensus,
          importRecordsState, getImportData, resetFilters, bins, binView, selectedBin, selectedTaxonomy, resetBin, resetGC, resetCoverage,
          resetTaxonomies, setGCAverage, setCoverageAverage, setTotalLength} = this.props

    const getBinDropdown = (): JSX.Element => {
      return (
        <Popover content={<BinMenu bins={bins} setSelectedBin={this.props.setSelectedBin}/>} position={Position.BOTTOM}>
          <Button disabled={!bins.length} icon={'layout-group-by'} text='Select Bin'/>
        </Popover>)
    }

    const showCharts = (show: boolean): JSX.Element => {
      if (samplesPending) {
        return (
          <div style={{alignItems: 'center', justifyContent: 'center', display: 'flex', height: '80vh', width: '100%'}}>
            <Spinner size={100}/>
          </div>
        )
      } else if (!samples.length) {
        return (
          <div style={{alignItems: 'center', justifyContent: 'center', display: 'flex', height: '80vh', width: '100%'}}>
            <h2>Click on <span
              style={{backgroundColor: '#efefef', borderRadius: '4px', padding: '6px', margin: '6px', fontSize: 'initial', fontWeight: 400}}>
              <Icon icon={'import'}/> Import</span> to import your datasets and get started!</h2>
          </div>
        )
      } else {
        return (<UBinPlotsWrappers connection={connection} archaealEnzymeTypes={archaealEnzymeTypes}
                                   bacterialEnzymeTypes={bacterialEnzymeTypes} samples={samples}
                                   bins={bins} binView={binView} selectedBin={selectedBin} taxonomies={taxonomiesMap} domain={domain}
                                   selectedTaxonomy={selectedTaxonomy} excludedTaxonomies={excludedTaxonomies} setConsensus={setConsensus}
                                   updateDomain={updateDomain} updateDomainX={updateDomainX} updateDomainY={updateDomainY}
                                   setSelectedTaxonomy={setSelectedTaxonomy} addExcludedTaxonomy={addExcludedTaxonomy}
                                   setGCAverage={setGCAverage} setCoverageAverage={setCoverageAverage} setTotalLength={setTotalLength}/>)
      }
    }
    let dataLoaded: boolean = !samplesPending && samples.length > 0
    return (
      <div>
        <div style={homeStyle}>
          <div style={{width: '100%', display: 'flex'}}>
            <div style={{width: '60%', minWidth: '400px'}}>
              <ButtonGroup>
                <Popover content={<SampleMenu importRecords={importRecords} importRecordsState={importRecordsState}
                                              connection={connection} getImportData={getImportData}/>}
                         position={Position.RIGHT_BOTTOM}>
                  <Button icon='settings' text='Data Settings/Import' />
                </Popover>
                {getBinDropdown()}
                <Popover content={<ResetMenu resetAll={resetFilters} resetGC={resetGC} resetCoverage={resetCoverage}
                                             resetTaxonomies={resetTaxonomies} resetBin={resetBin}/>}
                         position={Position.RIGHT_BOTTOM}>
                  <Button icon={'filter-remove'} text='Reset filters'/>
                </Popover>
                <Button text={binView ? 'Show all (filtered) scaffolds' : 'Limit to Bin'} icon={binView ? 'selection' : 'circle'}
                        onClick={() => this.toggleBinView()}/>
              </ButtonGroup>
            </div>
            <div style={{width: '40%', minWidth: '300px', display: 'flex'}}>
              <BinNaming dataLoaded={dataLoaded} activeRecord={this.props.activeRecord}/>
            </div>
          </div>

          <div style={{marginTop: '8px'}}>
            {this.props.activeRecord && <Tag style={{maxHeight: '20px', margin: '4px'}} intent={'primary'} key={'activeRecord'}>Active Record: {this.props.activeRecord.name}</Tag>}
            {this.props.activeRecord && <Tag style={{maxHeight: '20px', margin: '4px'}} key={'lengthTotal'}>Length in total: {(this.props.totalLength/1000000).toFixed(2)} Mbps</Tag>}
            {this.props.selectedBin && <Tag style={{maxHeight: '20px', margin: '4px'}} intent={'success'} key={'selectedBin'}>Active Bin: {this.props.selectedBin.name}</Tag>}
          </div>

          <div style={{width: '100%', display: 'flex'}}>
            {showCharts(!!samples.length)}
          </div>
        </div>
      </div>

    )
  }
}

const mapStateToProps = (state: IClientState): IPropsFromState => ({
  activeRecord: getActiveRecord(state),
  importRecords: getImportRecords(state),
  connection: state.database.connection,
  taxonomiesMap: getTaxonomiesMap(state),
  samples: getSamples(state),
  samplesPending: getSamplesStatePending(state),
  importRecordsState: getImportRecordsState(state),
  domain: getDomain(state),
  archaealEnzymeTypes: getArchaealEnzymeTypes(state),
  bacterialEnzymeTypes: getBacterialEnzymeTypes(state),
  bins: getBins(state),
  binView: getBinView(state),
  selectedBin: getSelectedBin(state),
  selectedTaxonomy: getSelectedTaxonomy(state),
  excludedTaxonomies: getExcludedTaxonomies(state),
  totalLength: getTotalLength(state),
})

const mapDispatchToProps = (dispatch: Dispatch): IActionsFromState =>
  bindActionCreators(
    {
      changePage: push,
      startDb: DBActions.startDatabase,
      refreshImports: DBActions.refreshImports,
      getImportData: recordId => DBActions.getImportData(recordId),
      setDomain: domain => SamplesActions.setDomain(domain),
      updateDomain: domain => SamplesActions.updateDomain(domain),
      updateDomainX: domainX => SamplesActions.updateDomainX(domainX),
      updateDomainY: domainY => SamplesActions.updateDomainY(domainY),
      updateBinView: isActive => SamplesActions.updateBinView(isActive),
      setSelectedBin: binId => SamplesActions.setSelectedBin(binId),
      setSelectedTaxonomy: taxonomyId => SamplesActions.setSelectedTaxonomy(taxonomyId),
      addExcludedTaxonomy: taxonomyId => SamplesActions.addExcludedTaxonomy(taxonomyId),
      setConsensus: consensus => SamplesActions.setConsensus(consensus),
      setGCAverage: consensus => SamplesActions.setGCAverage(consensus),
      setCoverageAverage: consensus => SamplesActions.setCoverageAverage(consensus),
      setTotalLength: length => SamplesActions.setTotalLength(length),
      resetFilters: SamplesActions.resetFilters,
      resetGC: SamplesActions.resetGC,
      resetCoverage: SamplesActions.resetCoverage,
      resetTaxonomies: SamplesActions.resetTaxonomies,
      resetBin: SamplesActions.resetBin,
    },
    dispatch,
  )

export const Home = withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps,
  )(CHome),
)
