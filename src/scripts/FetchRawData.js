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
const STATE_OPEN = 'open'
const PULLS = 'pulls'
const OPEN_PR_DATES = 'pr_creation_dates'
const PR_MERGED_DATES = 'pr_merged_dates'
const REPOS = 'repos'
const STARGAZERS = "stargazers"
const FORKS = "forks"
const COMMITS = "commits"
const ISSUE_AUTHORS = "issueAuthors"
const PULL_AUTHORS = "pullAuthors"
const COMMENT_AUTHORS = "commentAuthors"

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
 * Returns the number of issues in a given state for a repository of an
 * organization.
 * @param repository the repository to extract the data from.
 * @param owner the owner of the repository.
 * @param state state of issues: open, all or closed.
 * @returns {Promise<any|Thenable<any>>}
 */
async function getIssueAndPullInStateCountForRepo (repository, owner, state) {
  return octokit.paginate(octokit.issues.listForRepo, {
    owner: owner,
    repo: repository,
    state: state,
    per_page: 100
  }).then(res => {
    let issueCount =  res.filter(item => item.pull_request == null).length
    return {'issueCount': issueCount, 'pullCount': res.length - issueCount}
  })
}

async function getDatesOfRepoStarring (repository, owner) {
  const toReturn = []
  return octokit.paginate(octokit.rest.activity.listStargazersForRepo, {
    owner: owner,
    repo: repository,
    headers: {
      "accept": 'application/vnd.github.v3.star+json'
    }
  }).then(res => {
    for (const i in res) {
      const date = new Date(res[i].starred_at)
      toReturn.push(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    }
    toReturn.sort(ascOrder)
    return toReturn
  })
}
async function getDatesOfRepoSubscription (repository, owner) {
  const toReturn = []
  return octokit.paginate(`GET /${REPOS}/${owner}/${repository}/subscribers`, {
    owner: owner,
    repo: repository,
  }).then(res => {
    for (const i in res) {
      const date = new Date(res[i].starred_at)
      toReturn.push(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    }
    toReturn.sort(ascOrder)
    return toReturn
  })
}

async function getDatesOfRepoForking (repository, owner) {
  return octokit.paginate(`GET /${REPOS}/${owner}/${repository}/forks`, {
    repo: repository,
    per_page: 100
  }).then(res => {
    const toReturn = []
    for (const i in res) {
      const date = new Date(res[i].created_at)
      toReturn.push(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    }
    toReturn.sort(ascOrder)
    return toReturn
  })
}

async function getDatesOfRepoCommits (repository, owner) {
  return octokit.paginate(`GET /${REPOS}/${owner}/${repository}/commits`, {
    repo: repository,
    per_page: 100
  }).then(res => {
    const toReturn = []
    for (const i in res) {
      const date = new Date(res[i].commit.committer.date)
      toReturn.push(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    }
    toReturn.sort(ascOrder)
    return toReturn
  }
  )
}

/**
 * Returns the list of dates on which a user authored an issue for the first time.
 * @param repository
 * @param owner
 * @returns {Promise<*>}
 */
async function getIssueNewAuthors (repository, owner) {
  const datePerIssueAuthor = {}
  return octokit.paginate(octokit.issues.listForRepo, {
    owner: owner,
    repo: repository,
    state: 'all'
  }).then(res => {
    const issues = res.filter(item => item.pull_request == null)
    for (const i in issues) {
      const issue = issues[i]
      const dateTime = new Date(issue.created_at);
      const date = new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate())
      if (issue.user.id in datePerIssueAuthor) {
        if (datePerIssueAuthor[issue.user.id] <= date) {
          datePerIssueAuthor[issue.user.id] = date
        }
      } else {
        datePerIssueAuthor[issue.user.id] = date
      }
    }
    const toReturn = Object.values(datePerIssueAuthor)
    toReturn.sort(ascOrder)
    return toReturn
  })
}

/**
 * Returns the list of dates on which a user authored a pull request for the first time.
 * @param repository
 * @param owner
 * @returns {Promise<*>}
 */
async function getPullRequestNewAuthors (repository, owner) {
  const datePerPullRequestAuthor = {}
  return octokit.paginate(octokit.issues.listForRepo, {
    owner: owner,
    repo: repository,
    state: 'all'
  }).then(res => {
    const pullRequests = res.filter(item => item.pull_request != null)
    for (const i in pullRequests) {
      const pullRequest = pullRequests[i]
      const dateTime = new Date(pullRequest.created_at)
      const date = new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate())
      if (pullRequest.user.id in datePerPullRequestAuthor) {
        if (datePerPullRequestAuthor[pullRequest.user.id] <= date) {
          datePerPullRequestAuthor[pullRequest.user.id] = date
        }
      } else {
        datePerPullRequestAuthor[pullRequest.user.id] = date
      }
    }
    const toReturn = Object.values(datePerPullRequestAuthor)
    toReturn.sort(ascOrder)
    return toReturn
  })
}

/**
 * Returns the list of dates on which a user authored a commit on an issue or a pull request for the first time.
 * @param repository
 * @param owner
 * @returns {Promise<*>}
 */
async function getCommentsNewAuthors (repository, owner) {
  const datePerCommentAuthor = {}
  return octokit.paginate(octokit.issues.listCommentsForRepo, {
    owner: owner,
    repo: repository,
    state: 'all',
    per_page: 100
  }).then(comments => {
    for (const i in comments) {
      const comment = comments[i]
      const dateTime = new Date(comment.created_at)
      const date = new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate())
      if (comment.author_association !== 'MEMBER') {
        if (comment.user.id in datePerCommentAuthor) {
          if (datePerCommentAuthor[comment.user.id] <= date) {
            datePerCommentAuthor[comment.user.id] = date
          }
        } else {
          datePerCommentAuthor[comment.user.id] = date
        }
      }
  }
  const toReturn = Object.values(datePerCommentAuthor)
  toReturn.sort(ascOrder)
  return toReturn
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
      let issue = res[i]
      if (issue.pull_request == null ) {
        const date = new Date(issue.created_at)
        toReturn.push(
          new Date(date.getFullYear(), date.getMonth(), date.getDate()))
      }
    }
    return toReturn.sort(ascOrder)
  })
}

/**
 * Returns the list of creation date of all issue and pull request comments sorted by chronological
 * order.
 * @param repository the repository to extract the data from
 * @param owner the owner of the repository
 * @returns {Promise<this|Thenable<this>>} the list of creation date of all
 * issue and pull requests comments sorted by chronological order
 */
async function getAllIssueAndPullRequestCommentDates (repository, owner) {
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
 * Returns the list of creation date of all issue and pull request comments authored by users
 * outside of MobilityData sorted by chronological order.
 * @param repository the repository to extract the data from
 * @param owner the owner of the repository
 * @returns {Promise<this|Thenable<this>>} the list of creation date of all
 * issue comments authored by users outside of MobilityData sorted by chronological
 * order.
 */
async function getAllExternalContributorsIssueAndPullRequestCommentsDates (repository,
  owner) {
  return octokit.paginate(octokit.issues.listCommentsForRepo, {
    owner: owner,
    repo: repository,
    per_page: 100
  }).then(comments => {
    const toReturn = []
    if (comments.
      length === 0) {
      return []
    }
    for (const i in comments) {
      // to check is user exists (no ghost)
      if (comments[i].user) {
        const userLogin = comments[i].user.login
        if (isExternalContributor(userLogin)) {
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
 * @returns true if user is not affiliated to MobilityData,
 * else false.
 */
function isExternalContributor (handler) {
// very ugly and not optimal but it seems that there is an error not caught when
  // directly using the github aPI
  const members = ["ameliembd", "barbeau", "carlfredl", "Cristhian-HA",
    "danielmbd", "ElisabethPDefoy", "emmambd", "fredericsimard",
    "genevieveproulx", "GretchenNewcomb", "heidiguenin", "isabelle-dr",
    "jessicacir", "josee-sabourin", "kaiomi-i", "LeoFrachet", "lionel-nj",
    "maximearmstrong", "michellenguyenta", "mplsmitch", "newton-davis",
    "omar-kabbani", "scmcca", "TuThoThai", "ValerieGiguere"
  ]
  if (members.includes(handler)) {
    return false
  }
  return true
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

    await getAllIssueAndPullRequestCommentDates(repo, owner)
      .then(issueCommentsData => {
        metrics[COMMENTS_DATES] = issueCommentsData
      }).catch(error => console.log(error))

    await getAllExternalContributorsIssueAndPullRequestCommentsDates(repo, owner)
      .then(externalIssueAndPullCommentsData => {
        metrics[EXTERNAL_COMMENTS_DATES] = externalIssueAndPullCommentsData
      }).catch(error => console.log(error))

    await getIssueAndPullInStateCountForRepo(repo, owner, STATE_OPEN)
      .then(openIssueAndPullCount => {
        metrics[OPEN_ISSUE_COUNT] = openIssueAndPullCount.issueCount
        metrics[OPEN_PR_COUNT] = openIssueAndPullCount.pullCount
      }).catch(error => console.log(error))

    await getAllPullRequestCreationDates(repo, owner)
      .then(openPrData => {
        metrics[OPEN_PR_DATES] = openPrData
      })
      .catch(error => console.log(error))

    await getDatesOfRepoStarring(repo, owner)
      .then(stargazers => {
        metrics[STARGAZERS] = stargazers
      })
      .catch(error => console.log(error))

    await getDatesOfRepoForking(repo, owner)
      .then(forks => {
        metrics[FORKS] = forks
      })
      .catch(error => console.log(error))

    await getDatesOfRepoCommits(repo, owner)
      .then(commits => {
        metrics[COMMITS] = commits
      })
      .catch(error => console.log(error))

    await getIssueNewAuthors(repo, owner)
      .then(issueAuthors => {
        metrics[ISSUE_AUTHORS] = issueAuthors
      })
      .catch(error => console.log(error))

    await getPullRequestNewAuthors(repo, owner)
      .then(pullAuthors => {
        metrics[PULL_AUTHORS] = pullAuthors
      })
      .catch(error => console.log(error))

    await getCommentsNewAuthors(repo, owner)
      .then(commentAuthors => {
        metrics[COMMENT_AUTHORS] = commentAuthors
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
