import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const fs = require('fs')
require('dotenv').config()
const { google } = require('googleapis')
const { GoogleSpreadsheet } = require('google-spreadsheet')

const COUNT = 'count'
const CUMULATED = 'cumulated'
const DATA = 'data'
const DATE = 'date'
const FILENAME = 'metrics.json'
const OPEN_ISSUE_COUNT = 'open_issues_count'
const OPEN_PR_COUNT = 'open_pulls_count'
const Q1 = 'Q1'

async function updateSheetHeaders (newSheet, idx, idy, metric) {
  const titleCell = newSheet.getCell(idx, idy)
  titleCell.value = metric
  const dateTitleCell = newSheet.getCell(idx + 1, idy)
  dateTitleCell.value = DATE
  const countTitleCell = newSheet.getCell(idx + 1, idy + 1)
  countTitleCell.value = COUNT
  const cumulatedCell = newSheet.getCell(idx + 1, idy + 2)
  cumulatedCell.value = CUMULATED
  await newSheet.saveUpdatedCells()
}

async function updateDateRanges (idx, idy, metrics, repo, owner, metric,
  newSheet) {
  let x = idx + 2
  const y = idy
  let counter = 0
  for (const dateRange in Object.keys(metrics[repo][owner][metric])) {
    const cell = newSheet.getCell(x, y)
    const date = Object.keys(metrics[repo][owner][metric])[dateRange]
    if (date.includes(Q1)) {
      cell.value = date
    } else {
      if (counter === 0) {
        cell.value = date
      } else {
        cell.value = date.substring(0, 2)
      }
    }
    x += 1
    counter += 1
  }
  await newSheet.saveUpdatedCells()
}

async function updateCounts (idx, idy, metrics, repo, owner, metric,
  newSheet) {
  let x = idx + 2
  const y = idy + 1
  let cumulatedCellValue = 0
  for (const dateRange in Object.keys(metrics[repo][owner][metric])) {
    const countCell = newSheet.getCell(x, y)
    countCell.value = Object.values(metrics[repo][owner][metric])[dateRange]
    cumulatedCellValue += Object.values(metrics[repo][owner][metric])[dateRange]
    const cumulatedCell = newSheet.getCell(x, y + 1)
    cumulatedCell.value = cumulatedCellValue
    x += 1
  }
  await newSheet.saveUpdatedCells()
}

async function updatePunctualIndicators (newSheet, metrics, repo, owner) {
  const openIssueCountCell = newSheet.getCellByA1('K3')
  openIssueCountCell.value = metrics[repo][owner][OPEN_ISSUE_COUNT]
  const openPRCountCell = newSheet.getCellByA1('N3')
  openPRCountCell.value = metrics[repo][owner][OPEN_PR_COUNT]
  await newSheet.saveUpdatedCells()
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
export async function updateGoogleSheet (auth) {
  const metrics = JSON.parse(fs.readFileSync(`${DATA}/${FILENAME}`))
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID)
  await doc.useOAuth2Client(auth)
  await doc.loadInfo()

  for (const repo in metrics) {
    for (const owner in metrics[repo]) {
      const newSheet = doc.sheetsByTitle[`${repo}-${owner}`]
      const idx = 0
      let idy = 0
      await newSheet.loadCells('A1:Z50')

      for (const metric in metrics[repo][owner]) {
        await updateSheetHeaders(newSheet, idx, idy, metric)
        await updateDateRanges(idx, idy, metrics, repo, owner, metric,
          newSheet)
        await updateCounts(idx, idy, metrics, repo, owner, metric, newSheet)
        idy += 3
        // we  slow down the process on purpose because of the API rate limit
        // of 60 req/user/min applied by Google.
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      await updatePunctualIndicators(newSheet, metrics, repo, owner)
    }
  }
}
