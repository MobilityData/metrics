import { createRequire } from 'module';
const require = createRequire(import.meta.url);

require('dotenv').config()
const fs = require('fs')
const shell = require('shelljs')
const REPOS = 'repos'
const COMMENTS = 'comments'
const PULLS = 'pulls'
const ISSUE_CREATION_DATES = 'issue_creation_dates'
const PR_MERGED_DATES = 'pr_merged_dates'
const ISSUE_COMMENTS_DATES = 'issue_comments_dates'
const PR_COMMENTS_DATES = 'pr_comments_dates'
const OPEN_ISSUE_COUNT = 'open_issues_count'
const OPEN_PR_COUNT = 'open_pulls_count'
const DATA = 'data'
const STATE_OPEN = 'open'

const { Octokit } = require('@octokit/rest')
const octokit = new Octokit({
  auth: process.env.GH_TOKEN,
  baseUrl: 'https://api.github.com',
  log: {
    debug: () => {
    },
    info: () => {
    },
    warn: console.warn,
    error: console.error
  }
})
const repositories = [
  {
    repo: 'gtfs-validator',
    owner: 'MobilityData',
    direction: 'https://github.com/MobilityData/gtfs-validator'
  },
  {
    repo: 'transit',
    owner: 'MobilityData',
    direction: 'https://github.com/MobilityData/transit'
  },
  {
    repo: 'transit',
    owner: 'google',
    direction: 'https://github.com/google/transit'
  },
  {
    repo: 'gbfs',
    owner: 'NABSA',
    direction: 'https://github.com/nabsa/gbfs'
  },
  {
    repo: 'gbfs',
    owner: 'MobilityData',
    direction: 'https://github.com/MobilityData/gbfs'
  }
]

const ascOrder = function (firstDate, otherDate) {
  if (firstDate > otherDate) {
    return 1
  }
  if (firstDate < otherDate) {
    return -1
  }
}

async function getPullCountForRepo (repository, owner, state) {
  return await octokit.paginate(octokit.issues.listForRepo, {
    owner: owner,
    repo: repository,
    state: state,
    per_page: 100
  }).then(res => {
    return res.filter(item => item.pull_request != null).length
  })
}

async function getIssueCountForRepo (repository, owner, state) {
  return await octokit.paginate(octokit.issues.listForRepo, {
    owner: owner,
    repo: repository,
    state: state,
    per_page: 100
  }).then(res => {
    return res.filter(item => item.pull_request == null).length
  })
}

async function getAllPrMergeDatesCollection (repository, owner) {
  const toReturn = []
  return await octokit.paginate(`GET /${REPOS}/{owner}/{repo}/${PULLS}`, {
    owner: owner,
    repo: repository,
    state: 'all',
    per_page: 100
  }).then(res => {
    const filteredData = res.filter(item => item.merged_at !== null)
    for (const i in filteredData) {
      const date = new Date(filteredData[i].merged_at)
      toReturn.push(
        new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    }
    return toReturn.sort(ascOrder)
  })
}

async function getAllIssueCreationDateCollection (repository, owner) {
  const toReturn = []
  return await octokit.paginate(octokit.issues.listForRepo, {
    owner: owner,
    repo: repository,
    state: 'all',
    per_page: 100
  }).then(res => {
    for (const i in res) {
      const date = new Date(res[i].created_at)
      toReturn.push(
        new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    }
    return toReturn.sort(ascOrder)
  })
}

async function getAllIssueCommentsDateForRepo (repository, owner) {
  const toReturn = []
  return await octokit.paginate(octokit.issues.listCommentsForRepo, {
    owner: owner,
    repo: repository,
    per_page: 100
  }).then(res => {
    for (const i in res) {
      const date = new Date(res[i].created_at)
      toReturn.push(
        new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    }
    return toReturn.sort(ascOrder)
  })
}

async function getAllPrCommentsDateForRepo (repository, owner) {
  const toReturn = []
  return await octokit.paginate(
    `GET /${REPOS}/{owner}/{repo}/${PULLS}/${COMMENTS}`, {
      owner: owner,
      repo: repository,
      per_page: 100
    }).then(res => {
    for (const i in res) {
      const date = new Date(res[i].created_at)
      toReturn.push(
        new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    }
    return toReturn.sort(ascOrder)
  })
}

async function fetchRawData () {
  console.log('Fetching raw data from Github ⏳ ')
  let data = {}

  for (const i in repositories) {
    let metrics = {}
    const repository = repositories[i]
    const repo = repository.repo
    const owner = repository.owner
    if (data[owner] == null) {
      data[owner] = {}
    }
    await getAllIssueCreationDateCollection(repo, owner)
    .then(issueCreationData => {
      metrics[ISSUE_CREATION_DATES] = issueCreationData
    }).catch(error => console.log(error))

    await getAllPrMergeDatesCollection(repo, owner)
    .then(prMergedData => {
      metrics[PR_MERGED_DATES] = prMergedData
    }).catch(error => console.log(error))

    await getAllIssueCommentsDateForRepo(repo, owner)
    .then(issueCommentsData => {
      metrics[ISSUE_COMMENTS_DATES] = issueCommentsData
    }).catch(error => console.log(error))

    await getAllPrCommentsDateForRepo(repo, owner)
    .then(prCommentsData => {
      metrics[PR_COMMENTS_DATES] = prCommentsData
    }).catch(error => console.log(error))

    await getIssueCountForRepo(repo, owner, STATE_OPEN)
    .then(openIssueCount => {
      metrics[OPEN_ISSUE_COUNT] = openIssueCount
    }).catch(error => console.log(error))

    await getPullCountForRepo(repo, owner, STATE_OPEN)
    .then(openPullCount => {
      metrics[OPEN_PR_COUNT] = openPullCount
    }).catch(error => console.log(error))

    data[owner][repo] = metrics
    console.log(`🏡 Owner: ${owner}`)
    console.log(`🗄 Repository: ${repo}`)
    console.log(`🔗 Link: ${repository.direction}`)
    console.log('\n')
  }
  shell.mkdir('-p', `${DATA}/`)
  fs.writeFileSync(`${DATA}/raw_data.json`, JSON.stringify(data))
}

fetchRawData()
