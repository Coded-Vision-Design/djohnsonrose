import { useEffect, useState } from 'react'
import {
  EXCEL_TABS,
  cellValue,
  loadChecked,
  portfolioSheet,
  type Sheet,
} from '../../../../assets/js/windowing/office.js'

// Excel: the portfolio as a sheet, from data/portfolio.json. What it shows
// lives in assets/js/windowing/office.js, which v1 shares, and it is styled by
// assets/css/office.css, so this file only draws the screen.

const EMPTY = portfolioSheet(null)

export default function Excel() {
  const [sheet, setSheet] = useState<Sheet>(EMPTY)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [active, setActive] = useState('A1')

  useEffect(() => {
    let cancelled = false
    loadChecked('/data/portfolio.json')
      .then((data) => {
        if (cancelled) return
        setSheet(portfolioSheet(data))
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const status =
    state === 'error' ? 'portfolio.json could not be loaded' : state === 'ready' ? `Count: ${sheet.count}` : 'Loading…'

  return (
    <div className="office-app" data-office-app="excel">
      <div className="office-titlebar">
        <div className="office-titlebar-name">
          <img src="/assets/img/excel.webp" alt="" />
          <span>portfolio.xlsx - Excel</span>
        </div>
        <span className="office-user office-optional">DeVanté Johnson-Rose</span>
      </div>

      <div className="office-tabs">
        {EXCEL_TABS.map((tab) => (
          <span key={tab} className="office-tab" data-active={tab === 'Home' ? '' : undefined}>
            {tab}
          </span>
        ))}
      </div>

      <div className="excel-formula">
        <div className="excel-namebox" data-excel-namebox="">
          {active}
        </div>
        <span className="excel-fx" aria-hidden="true">
          fx
        </span>
        <input type="text" readOnly aria-label="Formula bar" data-excel-formula="" value={cellValue(sheet, active)} />
      </div>

      <div className="excel-sheet">
        <table className="excel-grid" role="grid" aria-label="portfolio.xlsx">
          <thead>
            <tr>
              <th className="excel-rowhead" scope="col" />
              {sheet.columns.map((letter) => (
                <th key={letter} scope="col">
                  {letter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row) => (
              <tr key={row.number}>
                <th className="excel-rowhead" scope="row">
                  {row.number}
                </th>
                {row.cells.map((cell) => (
                  <td
                    key={cell.ref}
                    data-cell={cell.ref}
                    data-header={cell.header && cell.value ? '' : undefined}
                    aria-selected={cell.ref === active}
                    title={cell.value || undefined}
                    onClick={() => setActive(cell.ref)}
                  >
                    {cell.value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="office-status">
        <div className="office-status-group">
          <span>Sheet1</span>
        </div>
        <div className="office-status-group" data-excel-status="">
          <span>{status}</span>
          <span className="office-optional">Ready</span>
        </div>
      </div>
    </div>
  )
}
