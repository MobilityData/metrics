require('dotenv').config()
const fs = require('fs')
const shell = require('shelljs')
const REPOS = 'repos'
const COMMENTS = 'comments'
const PULLS = 'pulls'
const ISSUE_CREATION_JSON = 'issue_creation.json'
const PR_MERGED_JSON = 'pr_merged.json'
const ISSUE_COMMENTS_JSON = 'issue_comments.json'
const PR_COMMENTS_JSON = 'pr_comments.json'
const OPEN_ISSUE_JSON = 'open_issues_count.json'
const OPEN_PR_JSON = 'open_pulls_count.json'
const DATA = 'data'
const RAW = 'raw'
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

async function getAllIssueCommentForRepo (repository, owner) {
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

async function getAllPrCommentForRepo (repository, owner) {
  const toReturn = []
  return await octokit.paginate(`GET /${REPOS}/{owner}/{repo}/${PULLS}/${COMMENTS}`, {
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

export async function fetchRawData () {
  console.log('Fetching raw data from Github ⏳ ')
  for (const i in repositories) {
    const repository = repositories[i]
    const repo = repository.repo
    const owner = repository.owner

    shell.mkdir('-p', `${DATA}/${RAW}/${owner}/${repo}/`)
    await getAllIssueCreationDateCollection(repo, owner)
      .then(issueCreationData => {
        fs.writeFileSync(`${DATA}/${RAW}/${owner}/${repo}/${ISSUE_CREATION_JSON}`,
          JSON.stringify(issueCreationData))
      }).catch(error => console.log(error))

    await getAllPrMergeDatesCollection(repo, owner)
      .then(issueCreationData => {
        fs.writeFileSync(`${DATA}/${RAW}/${owner}/${repo}/${PR_MERGED_JSON}`,
          JSON.stringify(issueCreationData))
      }).catch(error => console.log(error))

    await getAllIssueCommentForRepo(repo, owner)
      .then(issueCreationData => {
        fs.writeFileSync(`${DATA}/${RAW}/${owner}/${repo}/${ISSUE_COMMENTS_JSON}`,
          JSON.stringify(issueCreationData))
      }).catch(error => console.log(error))

    await getAllPrCommentForRepo(repo, owner)
      .then(issueCreationData => {
        fs.writeFileSync(`${DATA}/${RAW}/${owner}/${repo}/${PR_COMMENTS_JSON}`,
          JSON.stringify(issueCreationData))
      }).catch(error => console.log(error))

    await getIssueCountForRepo(repo, owner, STATE_OPEN)
      .then(openIssueCount => {
        fs.writeFileSync(`${DATA}/${RAW}/${owner}/${repo}/${OPEN_ISSUE_JSON}`,
          JSON.stringify(openIssueCount))
      }).catch(error => console.log(error))

    await getPullCountForRepo(repo, owner, STATE_OPEN)
      .then(openPullCount => {
        fs.writeFileSync(`${DATA}/${RAW}/${owner}/${repo}/${OPEN_PR_JSON}`,
          JSON.stringify(openPullCount))
      }).catch(error => console.log(error))

    console.log(`🗄 Repository: ${repo}`)
    console.log(`🏡 Owner: ${owner}`)
    console.log(`🔗 Link: ${repository.direction}`)
    console.log('\n')
  }
}

