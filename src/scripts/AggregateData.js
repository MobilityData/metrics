import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs')
const shell = require('shelljs')
const moment = require('moment')

const COMMENTS_DATES = 'comments_dates'
const DATA = 'data'
const FILENAME = 'metrics.json'
const ISSUE_CREATION_DATES = 'issue_creation_dates'
const JSON_EXTENSION = '.json'
const MERGED = 'total'
const METRICS_PREFIX = `metrics_`
const OPEN_ISSUE_COUNT = 'open_issues_count'
const OPEN_PR_COUNT = 'open_pulls_count'
const PR_MERGED_DATES = 'pr_merged_dates'
const RAW_DATA_JSON = `raw_data.json`
const RAW_DATA = `raw_data`
const TMP = 'tmp'

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

function merge (rawData, repo, owner1, owner2) {
  console.log(`Merging data from ${owner1} and ${owner2} ⏳ `)
  const mergedData = {}
  mergedData[repo] = {}
  mergedData[repo][owner1] = {}
  mergedData[repo][owner2] = {}
  mergedData[repo][MERGED] = {}

  mergedData[repo][owner1][COMMENTS_DATES] = rawData[owner1][repo][COMMENTS_DATES]
  mergedData[repo][owner2][COMMENTS_DATES] = rawData[owner2][repo][COMMENTS_DATES]
  mergedData[repo][MERGED][COMMENTS_DATES] = mergedData[repo][owner1][COMMENTS_DATES].concat(mergedData[repo][owner2][COMMENTS_DATES])

  mergedData[repo][owner1][ISSUE_CREATION_DATES] = rawData[owner1][repo][ISSUE_CREATION_DATES]
  mergedData[repo][owner2][ISSUE_CREATION_DATES] = rawData[owner2][repo][ISSUE_CREATION_DATES]
  mergedData[repo][MERGED][ISSUE_CREATION_DATES] = mergedData[repo][owner1][ISSUE_CREATION_DATES].concat(mergedData[repo][owner2][ISSUE_CREATION_DATES])

  mergedData[repo][owner1][PR_MERGED_DATES] = rawData[owner1][repo][PR_MERGED_DATES]
  mergedData[repo][owner2][PR_MERGED_DATES] = rawData[owner2][repo][PR_MERGED_DATES]
  mergedData[repo][MERGED][PR_MERGED_DATES] = mergedData[repo][owner1][PR_MERGED_DATES].concat(mergedData[repo][owner2][PR_MERGED_DATES])

  mergedData[repo][owner1][OPEN_ISSUE_COUNT] = rawData[owner1][repo][OPEN_ISSUE_COUNT]
  mergedData[repo][owner2][OPEN_ISSUE_COUNT] = rawData[owner2][repo][OPEN_ISSUE_COUNT]
  mergedData[repo][MERGED][OPEN_ISSUE_COUNT] = mergedData[repo][owner1][OPEN_ISSUE_COUNT] + mergedData[repo][owner2][OPEN_ISSUE_COUNT]

  mergedData[repo][owner1][OPEN_PR_COUNT] = rawData[owner1][repo][OPEN_PR_COUNT]
  mergedData[repo][owner2][OPEN_PR_COUNT] = rawData[owner2][repo][OPEN_PR_COUNT]
  mergedData[repo][MERGED][OPEN_PR_COUNT] = mergedData[repo][owner1][OPEN_PR_COUNT] + mergedData[repo][owner2][OPEN_PR_COUNT]

  shell.mkdir('-p', `${DATA}/${TMP}`)
  fs.writeFileSync(`${DATA}/${TMP}/metrics_${repo}.json`, JSON.stringify(mergedData))
}

function aggregateDataForSingleOwner (rawData, repo, owner) {
  const comments = rawData[owner][repo][COMMENTS_DATES]
  const issueCreation = rawData[owner][repo][ISSUE_CREATION_DATES]
  const prMerged = rawData[owner][repo][PR_MERGED_DATES]

  const data = {}
  data[repo] = {}
  data[repo][owner] = {}
  data[repo][owner][COMMENTS_DATES] = byQuarterYear(getDateCount(comments))
  data[repo][owner][ISSUE_CREATION_DATES] = byQuarterYear(getDateCount(issueCreation))
  data[repo][owner][PR_MERGED_DATES] = byQuarterYear(getDateCount(prMerged))
  data[repo][owner][OPEN_ISSUE_COUNT] = rawData[owner][repo][OPEN_ISSUE_COUNT]
  data[repo][owner][OPEN_PR_COUNT] = rawData[owner][repo][OPEN_PR_COUNT]
  return data;
}

function aggregateDataForMultipleOwner (mergedData, repo, owner1, owner2) {
  const data = {}
  data[repo] = {}
  data[repo][owner1] = {}
  data[repo][owner2] = {}
  data[repo][MERGED] = {}

  const owners = [owner1, owner2, MERGED]
  for (const i in owners) {
    const owner = owners[i]
    data[repo][owner][COMMENTS_DATES] = byQuarterYear(
      getDateCount(mergedData[repo][owner][COMMENTS_DATES]))
    data[repo][owner][ISSUE_CREATION_DATES] = byQuarterYear(
      getDateCount(mergedData[repo][owner][ISSUE_CREATION_DATES]))
    data[repo][owner][PR_MERGED_DATES] = byQuarterYear(
      getDateCount(mergedData[repo][owner][PR_MERGED_DATES]))
    data[repo][owner][OPEN_ISSUE_COUNT] = mergedData[repo][owner][OPEN_ISSUE_COUNT]
    data[repo][owner][OPEN_PR_COUNT] = mergedData[repo][owner][OPEN_PR_COUNT]
  }
  return data;
}

function aggregate () {
  let data = {};
  console.log('Aggregating data ⏳ ')
  const rawData = JSON.parse(fs.readFileSync(`${DATA}/raw_data.json`))

  merge(rawData, 'transit', 'google', 'MobilityData')
  merge(rawData, 'gbfs', 'NABSA', 'MobilityData')
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
    data[repo] = aggregateDataForSingleOwner(JSON.parse(fs.readFileSync(`${DATA}/${RAW_DATA}${JSON_EXTENSION}`)), repo, owner)[repo]
  }
  // aggregate data for repositories owned by a two organization
  for (const i in multipleOwnerRepositories) {
    const repo = multipleOwnerRepositories[i].repo
    const owner1 = multipleOwnerRepositories[i].owner1
    const owner2 = multipleOwnerRepositories[i].owner2
    data[repo] = aggregateDataForMultipleOwner(JSON.parse(fs.readFileSync(`${DATA}/${TMP}/${METRICS_PREFIX}${repo}${JSON_EXTENSION}`)), repo, owner1, owner2)[repo]
  }
  fs.writeFileSync(`${DATA}/${FILENAME}`, JSON.stringify(data))
}

function removeDirectories (dirs) {
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

merge(JSON.parse(fs.readFileSync(`${DATA}/${RAW_DATA_JSON}`)), 'transit', 'google', 'MobilityData')
merge(JSON.parse(fs.readFileSync(`${DATA}/${RAW_DATA_JSON}`)), 'gbfs', 'NABSA', 'MobilityData')
aggregate()
removeDirectories([`${DATA}/${TMP}`])
