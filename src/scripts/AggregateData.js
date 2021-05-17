import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs')
const shell = require('shelljs')
const moment = require('moment')
const MERGED = 'merged'
const DATA = 'data'
const RAW = 'raw'
const TMP = 'tmp'
const ISSUE_COMMENTS_COUNT = 'issueCommentsCount'
const ISSUE_CREATION_DATES = 'issueCreationDates'
const PR_COMMENTS_COUNT = 'prCommentsCount'
const MERGED_PR_DATES = 'mergedPrDates'
const AGGREGATED = 'aggregated'
const ISSUE_CREATION_JSON = 'issue_creation.json'
const PR_MERGED_JSON = 'pr_merged.json'
const ISSUE_COMMENTS_JSON = 'issue_comments.json'
const PR_COMMENTS_JSON = 'pr_comments.json'
const JSON_EXTENSION = '.json'
function getDateCount (dateList) {
  const toReturn = {}
  for (const i in dateList) {
    if (dateList[i] in toReturn) {
      toReturn[dateList[i]] = toReturn[dateList[i]] + 1
    } else {
      toReturn[dateList[i]] = 1
    }
  }
  return toReturn
}

function toQuarterYear (date) {
  const quarter = moment(date.toUTCString()).quarter()
  const year = date.getFullYear()
  return `Q${quarter}-${year}`
}

function byQuarterYear (dateCountDict) {
  const toReturn = {}
  for (const i in dateCountDict) {
    if (toQuarterYear(new Date(i)) in toReturn) {
      toReturn[toQuarterYear(new Date(i))] = toReturn[toQuarterYear(
        new Date(i))] + dateCountDict[i]
    } else {
      toReturn[toQuarterYear(new Date(i))] = dateCountDict[i]
    }
  }
  return toReturn
}

export async function merge (repo, owner1, owner2) {
  console.log(`Merging data from ${owner1} and ${owner2} ⏳ `)
  shell.mkdir('-p', `${DATA}/${TMP}/${repo}/`)
  const mergedData = {}

  const issueCommentsOwner1 = JSON.parse(
    fs.readFileSync(`${DATA}/${RAW}/${owner1}/${repo}/${ISSUE_COMMENTS_JSON}`))
  const issueCommentsOwner2 = JSON.parse(
    fs.readFileSync(`${DATA}/${RAW}/${owner2}/${repo}/${ISSUE_COMMENTS_JSON}`))
  mergedData[owner1] = issueCommentsOwner1
  mergedData[owner2] = issueCommentsOwner2
  mergedData[MERGED] = issueCommentsOwner1.concat(issueCommentsOwner2)
  fs.writeFileSync(`${DATA}/${TMP}/${repo}/${ISSUE_COMMENTS_JSON}`,
    JSON.stringify(mergedData))

  const issueCreationOwner1 = JSON.parse(
    fs.readFileSync(`${DATA}/${RAW}/${owner1}/${repo}/${ISSUE_CREATION_JSON}`))
  const issueCreationOwner2 = JSON.parse(
    fs.readFileSync(`${DATA}/${RAW}/${owner2}/${repo}/${ISSUE_CREATION_JSON}`))
  mergedData[owner1] = issueCreationOwner1
  mergedData[owner2] = issueCreationOwner2
  mergedData[MERGED] = issueCreationOwner1.concat(issueCreationOwner2)
  fs.writeFileSync(`${DATA}/${TMP}/${repo}/${ISSUE_CREATION_JSON}`,
    JSON.stringify(mergedData))

  const prCommentsOwner1 = JSON.parse(
    fs.readFileSync(`${DATA}/${RAW}/${owner1}/${repo}/${PR_COMMENTS_JSON}`))
  const prCommentsOwner2 = JSON.parse(
    fs.readFileSync(`${DATA}/${RAW}/${owner2}/${repo}/${PR_COMMENTS_JSON}`))
  mergedData[owner1] = prCommentsOwner1
  mergedData[owner2] = prCommentsOwner2
  mergedData[MERGED] = prCommentsOwner1.concat(prCommentsOwner2)
  fs.writeFileSync(`${DATA}/${TMP}/${repo}/${PR_COMMENTS_JSON}`,
    JSON.stringify(mergedData))

  const prMergedOwner1 = JSON.parse(
    fs.readFileSync(`${DATA}/${RAW}/${owner1}/${repo}/${PR_MERGED_JSON}`))
  const prMergedOwner2 = JSON.parse(
    fs.readFileSync(`${DATA}/${RAW}/${owner2}/${repo}/${PR_MERGED_JSON}`))
  mergedData[owner1] = prMergedOwner1
  mergedData[owner2] = prMergedOwner2
  mergedData[MERGED] = prMergedOwner1.concat(prMergedOwner2)
  fs.writeFileSync(`${DATA}/${TMP}/${repo}/${PR_MERGED_JSON}`,
    JSON.stringify(mergedData))
}

function aggregateDataForSingleOwner (repo, owner) {
  const issueComments = JSON.parse(
    fs.readFileSync(`${DATA}/${RAW}/${owner}/${repo}/${ISSUE_COMMENTS_JSON}`))
  const issueCreation = JSON.parse(
    fs.readFileSync(`${DATA}/${RAW}/${owner}/${repo}/${ISSUE_CREATION_JSON}`))
  const prComments = JSON.parse(
    fs.readFileSync(`${DATA}/${RAW}/${owner}/${repo}/${PR_COMMENTS_JSON}`))
  const prMerged = JSON.parse(
    fs.readFileSync(`${DATA}/${RAW}/${owner}/${repo}/${PR_MERGED_JSON}`))

  const data = {}
  data[repo] = {}
  data[repo][owner] = {}
  data[repo][owner][ISSUE_COMMENTS_COUNT] = byQuarterYear(
    getDateCount(issueComments))
  data[repo][owner][ISSUE_CREATION_DATES] = byQuarterYear(
    getDateCount(issueCreation))
  data[repo][owner][PR_COMMENTS_COUNT] = byQuarterYear(
    getDateCount(prComments))
  data[repo][owner][MERGED_PR_DATES] = byQuarterYear(getDateCount(prMerged))
  fs.writeFileSync(`${DATA}/${AGGREGATED}/${repo}${JSON_EXTENSION}`, JSON.stringify(data))
}

function aggregateDataForMultipleOwner (repo, owner1, owner2) {
  const issueComments = JSON.parse(
    fs.readFileSync(`${DATA}/${TMP}/${repo}/${ISSUE_COMMENTS_JSON}`))
  const issueCreation = JSON.parse(
    fs.readFileSync(`${DATA}/${TMP}/${repo}/${ISSUE_CREATION_JSON}`))
  const prComments = JSON.parse(
    fs.readFileSync(`${DATA}/${TMP}/${repo}/${PR_COMMENTS_JSON}`))
  const prMerged = JSON.parse(
    fs.readFileSync(`${DATA}/${TMP}/${repo}/${PR_MERGED_JSON}`))

  const data = {}
  data[repo] = {}
  data[repo][owner1] = {}
  data[repo][owner2] = {}
  data[repo][MERGED] = {}
  const owners = [owner1, owner2, MERGED]
  for (const i in owners) {
    const owner = owners[i]
    data[repo][owner][ISSUE_COMMENTS_COUNT] = byQuarterYear(
      getDateCount(issueComments[owner]))
    data[repo][owner][ISSUE_CREATION_DATES] = byQuarterYear(
      getDateCount(issueCreation[owner]))
    data[repo][owner][PR_COMMENTS_COUNT] = byQuarterYear(
      getDateCount(prComments[owner]))
    data[repo][owner][MERGED_PR_DATES] = byQuarterYear(
      getDateCount(prMerged[owner]))
  }
  fs.writeFileSync(`${DATA}/${AGGREGATED}/${repo}${JSON_EXTENSION}`, JSON.stringify(data))
}

export function aggregate () {
  console.log('Aggregating data ⏳ ')
  shell.mkdir('-p', `${DATA}/${AGGREGATED}/`)
  const singleOwnerRepositories = [{
    repo: 'gtfs-validator',
    owner: 'MobilityData'
  }]
  const multipleOwnerRepositories = [
    {
      repo: 'transit',
      owner1: 'MobilityData',
      owner2: 'google'
    },
    {
      repo: 'gbfs',
      owner1: 'MobilityData',
      owner2: 'NABSA'
    }
  ]

  // aggregate data for repositories owned by a single organization
  for (const i in singleOwnerRepositories) {
    const repo = singleOwnerRepositories[i].repo
    const owner = singleOwnerRepositories[i].owner
    aggregateDataForSingleOwner(repo, owner)
  }
  // aggregate data for repositories owned by a two organization
  for (const i in multipleOwnerRepositories) {
    const repo = multipleOwnerRepositories[i].repo
    const owner1 = multipleOwnerRepositories[i].owner1
    const owner2 = multipleOwnerRepositories[i].owner2
    aggregateDataForMultipleOwner(repo, owner1, owner2)
  }
}

export function removeDirectories (dirs) {
  console.log('Removing temporary data files 🌬 ')
  for (const i in dirs) {
    const dir = dirs[i]
    fs.rmdir(dir, { recursive: true }, (err) => {
      if (err) {
        throw err
      }
    }
    )
  }
}

// merge('transit', 'google', 'MobilityData')
// merge('gbfs', 'NABSA', 'MobilityData')
// aggregate()
// removeDirectories([`${DATA}/${RAW}`, `${DATA}/${TMP}`])
