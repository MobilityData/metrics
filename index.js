import { createRequire } from 'module'
import { updateGoogleSheet } from './src/scripts/GoogleSheetUpdater.js'

const require = createRequire(import.meta.url)
const { google } = require('googleapis')
require('dotenv').config()
export const CREDENTIALS = process.env.CREDENTIALS
export const TOKEN = process.env.TOKEN

// Load client secrets from a secrets
// Authorize a client with credentials, then call the Google Sheets API.
authorize(JSON.parse(CREDENTIALS), updateGoogleSheet)

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize (credentials, callback) {
  const client_id = credentials.installed.client_id
  const client_secret = credentials.installed.client_secret
  const redirect_uris = credentials.installed.redirect_uris
  console.log(client_id)
  console.log(client_secret)
  console.log(redirect_uris)
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0])

  oAuth2Client.setCredentials(JSON.parse(TOKEN))
  callback(oAuth2Client)
}
