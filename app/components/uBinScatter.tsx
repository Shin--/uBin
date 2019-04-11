import * as React from "react"
import {VictoryAxis, VictoryScatter, VictoryChart, VictoryTheme, VictoryBrushContainer} from 'victory'
import {IBin, IDomain} from 'samples'
import {Crossfilter} from 'crossfilter2'
import {Dimension} from 'crossfilter2'
import {Switch} from '@blueprintjs/core'
import {Sample} from '../db/entities/Sample'
import {numToColour} from '../utils/convert'
import {compareArrayToString} from '../utils/compare'
import {Taxonomy} from '../db/entities/Taxonomy'


interface IProps {
  cf: Crossfilter<Sample>
  title?: string
  domainChangeHandler(domain: IDomain): void
  setGCAverage(avg: number): void
  setCoverageAverage(avg: number): void
  setTotalLength(length: number): void
  domain?: IDomain
  bin?: IBin
  binView: boolean
  selectedTaxonomy?: Taxonomy
  excludedTaxonomies?: Taxonomy[]
}

interface IScatterDetails {
  xSum: number
  ySum: number
  count: number
  lengthSum: number
  colour: string
}

export interface IUBinScatterState {
  combDim?: Dimension<Sample, string>
  binDim?: Dimension<Sample, number>
  covDim?: Dimension<Sample, number>
  gcDim?: Dimension<Sample, number>
  taxonomyDim?: Dimension<Sample, string>
  originalDomain?: IDomain
  logScale: boolean
}

export class UBinScatter extends React.PureComponent<IProps> {

  xAxis?: [number, number]
  yAxis?: [number, number]
  zoom?: number
  currentRanges?: {x: number, y: number}
  allowUpdate: boolean = true
  lengthTotal: number = 0
  gcAverage?: number
  coverageAverage?: number

  public state: IUBinScatterState = {
    logScale: false,
  }

  public componentWillMount(): void {
    let {cf} = this.props
    this.setState({
      combDim: cf.dimension((d: Sample) => Math.round(d.gc/2)*2+':'+Math.round(d.coverage/50)*50+':'+(d.bin ? d.bin.id : '')),
      binDim: cf.dimension((d: Sample) => d.bin ? d.bin.id : 0),
      covDim: cf.dimension((d: Sample) => d.coverage),
      taxonomyDim: cf.dimension((d: Sample) => d.taxonomiesRelationString),
      gcDim: cf.dimension((d: Sample) => d.gc),
    })
    this.setScatterScaling()
  }

  public componentDidMount(): void {
    let { covDim, gcDim } = this.state
    if (covDim && gcDim) {
      let bottom: Sample = gcDim.bottom(1)[0]
      let top: Sample = gcDim.top(1)[0]
      if (bottom && top) {
        this.setState({
          originalDomain: {
            x: [bottom.gc, top.gc],
            y: [bottom.coverage, top.coverage],
          },
        })
      } else {
        this.setState({
          originalDomain: {
            x: [0, 100],
            y: [0, 8000],
          },
        })
      }
    }
  }

  public componentWillUpdate(): void {
    this.setScatterScaling()
  }

  public setScatterScaling(): void {
    let {domain, cf} = this.props
    if (domain && domain.x && domain.y) {
      let currentXRange: number = Math.sqrt((domain.x[1] - domain.x[0])**2)
      let currentYRange: number = Math.sqrt((domain.y[1] - domain.y[0])**2)
      // console.log("currentXRange:", currentXRange, "currentYRange:", currentYRange, "this.currentRanges:", this.currentRanges)
      // console.log("True?", (!this.currentRanges || this.currentRanges.x !== currentXRange || this.currentRanges.y !== currentYRange))
      if (!this.currentRanges || this.currentRanges.y !== currentYRange) {
        this.currentRanges = {x: currentXRange, y: currentYRange}
        // let xRoundTo = Math.round(currentXRange/25) > 0 ? Math.round(currentXRange/25) : 0.5
        let yRoundTo = Math.round(currentYRange/100) > 10 ? Math.round(currentYRange/100) : 10
        // console.log("Round to:", yRoundTo, "range: ", currentYRange)
        this.setState({combDim: cf.dimension(
            (d: Sample) => d.gc+':'+this.round(d.coverage, yRoundTo, 0).toString()+':'+(d.bin ? d.bin.id : ''))},
        )
        this.allowUpdate = true
      }
    } else if (this.allowUpdate && this.currentRanges) {
      this.setState({
        combDim: cf.dimension((d: Sample) => Math.round(d.gc / 2) * 2 + ':' + Math.round(d.coverage / 50) * 50 + ':' + (d.bin ? d.bin.id : ''))
      })
      this.allowUpdate = false
    }
  }

  public reduceInitial(): any {
    return {xSum: 0, ySum: 0, count: 0, lengthSum: 0}
  }

  public reduceAdd(p: any, v: Sample): any {
    p.xSum += v.gc
    p.ySum += v.coverage
    p.lengthSum += v.length
    p.count += 1
    if (!p.colour) {
      if (v.bin) {
        p.colour = numToColour(v.bin.id)
      } else {
        p.colour = '#455a64'
      }
    }
    return p
  }

  public reduceRemove(p: any, v: Sample): any {
    p.xSum -= v.gc
    p.ySum -= v.coverage
    p.lengthSum -= v.length
    p.count -= 1
    return p
  }

  public round(num: number, x: number, o: number): number {
    // console.log("Num:", num, "x:", x, "o:", o, "return:", Math.round((o + Math.ceil((num - o)/ x ) * x)*10)/10)
    return Math.round((o + Math.ceil((num - o)/ x ) * x)*10)/10
  }

  public getData(): any {
    let { covDim, gcDim, combDim, binDim, taxonomyDim } = this.state
    let { domain, bin, binView, selectedTaxonomy, excludedTaxonomies } = this.props

    if (gcDim && covDim && combDim && binDim && taxonomyDim) {
      if (domain) {
        if (domain.x) {
          gcDim.filterRange(domain.x)
        } else {
          gcDim.filterAll()
        }
        if (domain.y) {
          covDim.filterRange(domain.y)
        } else {
          covDim.filterAll()
        }
      } else {
        gcDim.filterAll()
        covDim.filterAll()
        this.zoom = undefined
      }
      if (bin && binView) {
        binDim.filterExact(bin.id)
      } else {
        binDim.filterAll()
      }
      if (selectedTaxonomy) {
        let taxonomyString: string = ';'+selectedTaxonomy.id.toString()+';'
        let excludedTaxonomyStrings: string[] = excludedTaxonomies ? excludedTaxonomies.map(excludedTaxonomy => ';'+excludedTaxonomy.id.toString()+';') : []
        if (excludedTaxonomyStrings.length) {
          taxonomyDim.filterFunction((d: string) => d.indexOf(taxonomyString) >= 0 && !compareArrayToString(d, excludedTaxonomyStrings))
        } else {
          taxonomyDim.filterFunction((d: string) => d.indexOf(taxonomyString) >= 0)
        }
      } else if (excludedTaxonomies && excludedTaxonomies.length) {
        let excludedTaxonomyStrings: string[] = excludedTaxonomies ? excludedTaxonomies.map(excludedTaxonomy => ';'+excludedTaxonomy.id.toString()+';') : []
        taxonomyDim.filterFunction((d: string) => !compareArrayToString(d, excludedTaxonomyStrings))
      } else {
        taxonomyDim.filterAll()
      }
      // let logFactor: number = 10/Math.log(100)
      // let basePointSize: number = 10-Math.log((this.zoom !== undefined ? this.zoom || 0.01 : 1)*200)*logFactor
      // let basePointSize: number = 1
      let bottom: Sample = combDim.bottom(1)[0]
      let top: Sample = combDim.top(1)[0]
      let scalingFactor: number
      if (bottom && top) {
        scalingFactor = 20 / Math.sqrt((top.gc ** 2 - bottom.gc ** 2))
      }
      // let groupedGc = gcDim.group().all().filter(d => d.value)
      // let gcCount: number = 0
      // let gcSum: number = 0
      // for (let i: number = 0; i < groupedGc.length; i++){
      //   let c = groupedGc[i].value as number
      //   let s = groupedGc[i].key as number
      //   gcCount += c; gcSum += s*c
      // }
      // console.log(gcCount, gcSum)
      // if (gcSum/gcCount !== this.gcAverage) {
      //   this.props.setGCAverage(Math.round(gcSum/gcCount))
      // }
      // let groupedCoverage = covDim.group().all()
      // let covCount: number = 0
      // let covSum: number = 0
      // console.log(groupedCoverage)
      // for (let i: number = 0; i < groupedCoverage.length; i++){
      //   let c = groupedCoverage[i].value as number
      //   let s = groupedCoverage[i].key as number
      //   // console.log("g", groupedCoverage[i])
      //   covCount += c; covSum += s*c
      // }
      // console.log(covCount, covSum)
      // if (covSum/covCount !== this.coverageAverage) {
      //   this.props.setCoverageAverage(Math.round(covSum/covCount))
      // }
      this.lengthTotal = 0
      let gcSum: number = 0
      let covSum: number = 0
      let c: number = 0
      let returnVals: any = combDim.group().reduce(this.reduceAdd, this.reduceRemove, this.reduceInitial).all().
                              filter((value: any) => value.value.count).map((value: any) => {
        let valObj: IScatterDetails = value.value
        this.lengthTotal += valObj.lengthSum
        gcSum += valObj.xSum
        covSum += valObj.ySum
        c += valObj.count
        let size: number = Math.log(valObj.lengthSum)*scalingFactor
        return {gc: valObj.xSum/valObj.count, coverage: valObj.ySum/valObj.count, size, colour: valObj.colour}
      })
      this.props.setTotalLength(this.lengthTotal)
      if (this.coverageAverage !== covSum/c) {
        this.props.setCoverageAverage(Math.round(covSum/c))
        this.coverageAverage = covSum/c
      }
      if (this.gcAverage !== gcSum/c) {
        this.props.setGCAverage(Math.round(gcSum/c))
        this.gcAverage = gcSum/c
      }
      return returnVals
    }
    return []
  }

  public handleDomainChangeEnd(): void {
    if (this.props.domainChangeHandler) {
      let { xAxis, yAxis } = this
      this.props.domainChangeHandler({x: xAxis, y: yAxis})
    }
  }

  public handleDomainChange(domain: IDomain): void {
    this.xAxis = domain.x
    this.yAxis = domain.y
  }

  private handleLogScaleChange(): void {
    this.setState({logScale: !this.state.logScale})
}
  public render(): JSX.Element {
    let {logScale} = this.state
    console.log("render scatter")
    return (
      <div>
        <VictoryChart containerComponent={<VictoryBrushContainer
                                          defaultBrushArea="disable"
                                          onBrushDomainChange={(domain: any, props: any) => this.handleDomainChange(domain)}
                                          onBrushDomainChangeEnd={() => this.handleDomainChangeEnd()}/>}
                      theme={VictoryTheme.material}
                      height={500}
                      width={400}
                      padding={{ left: 50, top: 40, right: 10, bottom: 40 }}
                      domainPadding={{x: 20, y: [logScale ? 0 : 20, logScale ? 0 : 20]}}
                      scale={{ x: 'linear', y: logScale ? 'log' : 'linear' }}>
          <VictoryAxis
            tickFormat={(t: number) => Math.round(t*10)/10}
          />
          <VictoryAxis
            dependentAxis={true}
            tickFormat={(t: number) => {return  logScale ? t : t >= 1000 ? `${Math.round(t)/1000}k` : t >= 100 ? Math.round(t) : Math.round(t*10)/10}}
          />
          <VictoryScatter
            style={{
              data: {
                fill: (d: any) => d.colour,
              },
            }}
            bubbleProperty="size"
            maxBubbleSize={20}
            data={this.getData()}
            x={'gc'}
            y={'coverage'}
          />
        </VictoryChart>
        <div style={{display: 'flex', marginLeft: '50px'}}>
          <Switch checked={this.state.logScale} label={'Log Scaling'} onChange={() => this.handleLogScaleChange()}/>
          {/*<Tag style={{maxHeight: '20px'}} key={'lengthTotal'}>Length in total: {this.lengthTotal}</Tag>*/}
        </div>
      </div>
    )
  }
}