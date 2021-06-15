import { createRequire } from 'module'

const require = createRequire(import.meta.url)

require('dotenv').config()
const fs = require('fs')
const shell = require('shelljs')
const { Octokit } = require('@octokit/rest')

const COMMENTS = 'comments'
const COMMENTS_DATES = 'comments_dates'
const DATA = 'data'
const EXTERNAL_COMMENTS_DATES = 'external_comments_dates'
const ISSUE_CREATION_DATES = 'issue_creation_dates'
const OPEN_ISSUE_COUNT = 'open_issues_count'
const OPEN_PR_COUNT = 'open_pulls_count'
const MOBILITY_DATA = 'MobilityData'
const STATE_OPEN = 'open'
const PULLS = 'pulls'
const OPEN_PR_DATES = 'pr_creation_dates'
const PR_MERGED_DATES = 'pr_merged_dates'
const REPOS = 'repos'

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

/**
 * Returns the number of pull requests in a given state for a repository of an
 * organization.
 * @param repository the repository to extract the data from
 * @param owner the owner of the repository
 * @param state state of pull request: open, all, merged or closed.
 * @returns {Promise<any|Thenable<any>>}
 */
async function getPullRequestInStateCountForRepo (repository, owner, state) {
  return octokit.paginate(octokit.issues.listForRepo, {
    owner: owner,
    repo: repository,
    state: state,
    per_page: 100
  }).then(res => {
    return res.filter(item => item.pull_request != null).length
  })
}

/**
 * Returns the number of issues in a given state for a repository of an
 * organization.
 * @param repository the repository to extract the data from.
 * @param owner the owner of the repository.
 * @param state state of issues: open, all or closed.
 * @returns {Promise<any|Thenable<any>>}
 */
async function getIssueCountForRepo (repository, owner, state) {
  return octokit.paginate(octokit.issues.listForRepo, {
    owner: owner,
    repo: repository,
    state: state,
    per_page: 100
  }).then(res => {
    return res.filter(item => item.pull_request == null).length
  })
}

/**
 * Returns the list of dates on which pull request were open sorted by
 * chronological order.
 * @param repository the repository to extract the data from
 * @param owner the owner of the repository
 * @returns {Promise<this|Thenable<this>>} the list of dates on which pull
 * request were open sorted by chronological order
 */
async function getAllPullRequestCreationDates (repository, owner) {
  const toReturn = []
  return octokit.paginate(octokit.issues.listForRepo, {
    owner: owner,
    repo: repository,
    state: 'all',
    per_page: 100
  }).then(res => {
    const filteredData = res.filter(item => item.pull_request != null)
    for (const i in filteredData) {
      const date = new Date(filteredData[i].created_at)
      toReturn.push(date)
    }
    return toReturn.sort(ascOrder)
  })
}

/**
 * Returns the list of dates on which pull request from a repository
 * of an organization were merged, sorted by chronological order.
 * @param repository the repository to extract the data from
 * @param owner the owner of the repository
 * @returns {Promise<this|Thenable<this>>} the list of dates on which pull
 * request from a repository of an organization were merged, sorted by chronological
 * order.
 */
async function getAllPullRequestMergeDates (repository, owner) {
  const toReturn = []
  return octokit.paginate(`GET /${REPOS}/{owner}/{repo}/${PULLS}`, {
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

/**
 * Returns the list of dates of creation for all issues from a repository
 * of an organization, sorted by chronological order.
 * @param repository the repository to extract the data from
 * @param owner the owner of the repository
 * @returns {Promise<this|Thenable<this>>} the list of dates of creation for all
 * issues from a repository of an organization, sorted by chronological order
 */
async function getAllIssueCreationDates (repository, owner) {
  const toReturn = []
  return octokit.paginate(octokit.issues.listForRepo, {
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

/**
 * Returns the list of creation date of all issue comments sorted by chronological
 * order.
 * @param repository the repository to extract the data from
 * @param owner the owner of the repository
 * @returns {Promise<this|Thenable<this>>} the list of creation date of all
 * issue comments sorted by chronological order
 */
async function getAllIssueCommentDates (repository, owner) {
  const toReturn = []
  return octokit.paginate(octokit.issues.listCommentsForRepo, {
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

/**
 * Returns the list of creation date of all issue comments authored by users
 * outside of MobilityData sorted by chronological order.
 * @param repository the repository to extract the data from
 * @param owner the owner of the repository
 * @returns {Promise<this|Thenable<this>>} the list of creation date of all
 * issue comments authored by users outside of MobilityData sorted by chronological
 * order.
 */
async function getAllExternalContributorsIssueCommentsDates (repository,
  owner) {
  return octokit.paginate(octokit.issues.listCommentsForRepo, {
    owner: owner,
    repo: repository,
    per_page: 100
  }).then(comments => {
    const toReturn = []
    const externalContributors = []
    if (comments.length === 0) {
      return []
    }
    for (const i in comments) {
      if (comments[i].user) {
        const userLogin = comments[i].user.login
        if (externalContributors.includes(userLogin) || isExternalContributor(
          userLogin)) {
          if (!externalContributors.includes(userLogin)) {
            externalContributors.push(userLogin)
          }
          const date = new Date(comments[i].created_at)
          toReturn.push(
            new Date(date.getFullYear(), date.getMonth(), date.getDate()))
        }
      }
    }
    return toReturn.sort(ascOrder)
  })
}

/**
 * Returns the list of creation date of all pull requests comments authored by
 * users outside of MobilityData sorted by chronological order.
 * @param repository the repository to extract the data from
 * @param owner the owner of the repository
 * @returns {Promise<this|Thenable<this>>} the list of creation date of all pull
 * requests comments authored by users outside of MobilityData sorted by chronological order.
 */
async function getAllExternalContributorsPullRequestCommentsDates (repository,
  owner) {
  return octokit.paginate(
    `GET /${REPOS}/{owner}/{repo}/${PULLS}/${COMMENTS}`, {
      owner: owner,
      repo: repository,
      per_page: 100
    }).then(comments => {
    const toReturn = []
    const externalContributors = []
    if (comments.length === 0) {
      return []
    }
    for (const i in comments) {
      let userLogin = ''
      if (comments[i].user) {
        userLogin = comments[i].user.login
        if (externalContributors.includes(userLogin) || isExternalContributor(
          userLogin)) {
          if (!externalContributors.includes(userLogin)) {
            externalContributors.push(userLogin)
          }
          const date = new Date(comments[i].created_at)
          toReturn.push(
            new Date(date.getFullYear(), date.getMonth(), date.getDate()))
        }
      }
    }
    return toReturn.sort(ascOrder)
  })
}

/**
 * Returns the list of creation date of all pull requests comments sorted by
 * chronological order.
 * @param repository the repository to extract the data from
 * @param owner the owner of the repository
 * @returns {Promise<this|Thenable<this>>} the list of creation date of all pull
 * requests comments sorted by chronological order
 */
async function getAllPullRequestCommentsDates (repository, owner) {
  const toReturn = []
  return octokit.paginate(
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

/**
 * Determines whether a Github user is affiliated to MobilityData or no.
 * @param handler  the github handler of the user
 * @returns {Promise<void>} true if user is not affiliated to MobilityData,
 * else false.
 */
async function isExternalContributor (handler) {
  octokit.paginate(`GET /users/${handler}/orgs`)
    .then(organizations => {
      if (organizations.length === 0) {
        return true
      }
      for (const i in organizations) {
        if (organizations[i] === MOBILITY_DATA) {
          return false
        }
      }
      return true
    })
    .catch(error => {
      console.log(error)
    })
}

/**
 * Creates json file that contains raw data from different repositories for
 * different owners.
 * @returns {Promise<void>}
 */
async function fetchRawData () {
  console.log('Fetching raw data from Github ⏳ ')
  const data = {}

  for (const i in repositories) {
    const metrics = {}
    const repository = repositories[i]
    const repo = repository.repo
    const owner = repository.owner
    if (data[owner] == null) {
      data[owner] = {}
    }
    await getAllIssueCreationDates(repo, owner)
      .then(issueCreationData => {
        metrics[ISSUE_CREATION_DATES] = issueCreationData
      }).catch(error => console.log(error))

    await getAllPullRequestMergeDates(repo, owner)
      .then(prMergedData => {
        metrics[PR_MERGED_DATES] = prMergedData
      }).catch(error => console.log(error))

    await getAllIssueCommentDates(repo, owner)
      .then(issueCommentsData => {
        metrics[COMMENTS_DATES] = issueCommentsData
      }).catch(error => console.log(error))

    await getAllPullRequestCommentsDates(repo, owner)
      .then(prCommentsData => {
        const tmp = metrics[COMMENTS_DATES].concat(prCommentsData)
        metrics[COMMENTS_DATES] = tmp.sort(ascOrder)
      }).catch(error => console.log(error))

    await getAllExternalContributorsIssueCommentsDates(repo, owner)
      .then(externalIssueCommentsData => {
        metrics[EXTERNAL_COMMENTS_DATES] = externalIssueCommentsData
      }).catch(error => console.log(error))

    await getAllExternalContributorsPullRequestCommentsDates(repo, owner)
      .then(externalPrCommentsData => {
        const tmp = metrics[EXTERNAL_COMMENTS_DATES].concat(externalPrCommentsData)
        metrics[EXTERNAL_COMMENTS_DATES] = tmp.sort(ascOrder)
      }).catch(error => console.log(error))

    await getIssueCountForRepo(repo, owner, STATE_OPEN)
      .then(openIssueCount => {
        metrics[OPEN_ISSUE_COUNT] = openIssueCount
      }).catch(error => console.log(error))

    await getPullRequestInStateCountForRepo(repo, owner, STATE_OPEN)
      .then(openPullCount => {
        metrics[OPEN_PR_COUNT] = openPullCount
      }).catch(error => console.log(error))

    await getAllPullRequestCreationDates(repo, owner)
      .then(openPrData => {
        metrics[OPEN_PR_DATES] = openPrData
      })
      .catch(error => console.log(error))

    data[owner][repo] = metrics
    console.log(`🏡 Owner: ${owner}`)
    console.log(`🗄 Repository: ${repo}`)
    console.log(`🔗 Link: ${repository.direction}\n`)
  }
  shell.mkdir('-p', `${DATA}/`)
  fs.writeFileSync(`${DATA}/raw_data.json`, JSON.stringify(data))
}

fetchRawData()
