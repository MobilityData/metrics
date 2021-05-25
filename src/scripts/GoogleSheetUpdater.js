import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const fs = require('fs')
require('dotenv').config()
const { google } = require('googleapis')
const { GoogleSpreadsheet } = require('google-spreadsheet')



async function updateSheetHeaders (newSheet, idx, idy, metric) {
  let titleCell = newSheet.getCell(idx, idy)
  titleCell.value = metric
  let dateTitleCell = newSheet.getCell(idx + 1, idy)
  dateTitleCell.value = DATE
  let countTitleCell = newSheet.getCell(idx + 1, idy + 1)
  countTitleCell.value = COUNT
  let cumulatedCell = newSheet.getCell(idx + 1, idy + 2)
  cumulatedCell.value = CUMULATED
  await newSheet.saveUpdatedCells()
}

async function updateDateRanges (idx, idy, metrics, repo, owner, metric,
  newSheet) {
  let x = idx + 2
  let y = idy
  for (let dateRange in Object.keys(metrics[repo][owner][metric])) {
    let cell = newSheet.getCell(x, y)
    cell.value = Object.keys(metrics[repo][owner][metric])[dateRange]
    x += 1
  }
  await newSheet.saveUpdatedCells()
}

async function updateCounts (idx, idy, metrics, repo, owner, metric,
  newSheet) {
  let x = idx + 2
  let y = idy + 1
  let cumulatedCellValue = 0
  for (let dateRange in Object.keys(metrics[repo][owner][metric])) {
    let countCell = newSheet.getCell(x, y)
    countCell.value = Object.values(metrics[repo][owner][metric])[dateRange]
    cumulatedCellValue += Object.values(metrics[repo][owner][metric])[dateRange]
    let cumulatedCell = newSheet.getCell(x, y + 1)
    cumulatedCell.value = cumulatedCellValue
    x += 1
  }
  await newSheet.saveUpdatedCells()
}

async function updatePunctualIndicators (newSheet, metrics, repo, owner) {
  let openIssueCountCell = newSheet.getCellByA1('K3')
  openIssueCountCell.value = metrics[repo][owner][OPEN_ISSUE_COUNT]
  let openPRCountCell = newSheet.getCellByA1('N3')
  openPRCountCell.value = metrics[repo][owner][OPEN_PR_COUNT]
  await newSheet.saveUpdatedCells()
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
export async function updateGoogleSheet (auth) {
  let metrics = JSON.parse(fs.readFileSync(`${DATA}/${FILENAME}`))
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID)
  await doc.useOAuth2Client(auth)
  await doc.loadInfo()

  for (let repo in metrics) {
    for (let owner in metrics[repo]) {
      let newSheet = doc.sheetsByTitle[`${repo}-${owner}`]
      let idx = 0, idy = 0
      await newSheet.loadCells('A1:Z50')

      for (let metric in metrics[repo][owner]) {
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
