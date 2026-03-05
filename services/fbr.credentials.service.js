// services/fbr.credentials.service.js
// All DB operations for FBR credentials. Never exposes raw encrypted values.

import FbrCredentials from "../models/fbrCredentials.model.js"

// -------------------------------------------------------------------
// Save or update credentials for a user
// Pass only the fields you want to update
// -------------------------------------------------------------------
export async function saveCredentials(userId, { token, posId, ntn, strn, environment }) {
  let creds = await FbrCredentials.findOne({ userId })

  if (!creds) {
    creds = new FbrCredentials({ userId })
  }

  // Only update fields that were actually provided
  if (token !== undefined) creds.token = token
  if (posId !== undefined) creds.posId = posId
  if (ntn !== undefined) creds.ntn = ntn
  if (strn !== undefined) creds.strn = strn
  if (environment !== undefined) creds.environment = environment

  // If all required fields are now present, mark active
  if (creds._token && creds._posId && creds._ntn) {
    creds.isActive = true
  }

  await creds.save()
  return creds.toSafeObject()
}

// -------------------------------------------------------------------
// Get safe (non-sensitive) summary for a user — for frontend display
// -------------------------------------------------------------------
export async function getCredentialsSummary(userId) {
  const creds = await FbrCredentials.findOne({ userId })
  if (!creds) return null
  return creds.toSafeObject()
}

// -------------------------------------------------------------------
// Get raw decrypted credentials — ONLY for internal API calls to FBR
// Never send this to the client
// -------------------------------------------------------------------
export async function getRawCredentials(userId) {
  const creds = await FbrCredentials.findOne({ userId })
  if (!creds || !creds.isActive) return null

  return {
    token: creds.token,
    posId: creds.posId,
    ntn: creds.ntn,
    strn: creds.strn,
    environment: creds.environment
  }
}

// -------------------------------------------------------------------
// Deactivate credentials (e.g. token expired or revoked)
// -------------------------------------------------------------------
export async function deactivateCredentials(userId) {
  const creds = await FbrCredentials.findOne({ userId })
  if (!creds) return null
  creds.isActive = false
  await creds.save()
  return creds.toSafeObject()
}

// -------------------------------------------------------------------
// Mark credentials as last verified now
// -------------------------------------------------------------------
export async function markVerified(userId) {
  const creds = await FbrCredentials.findOne({ userId })
  if (!creds) return null
  creds.lastVerifiedAt = new Date()
  await creds.save()
  return creds.toSafeObject()
}

// -------------------------------------------------------------------
// Delete credentials entirely
// -------------------------------------------------------------------
export async function deleteCredentials(userId) {
  await FbrCredentials.deleteOne({ userId })
  return { deleted: true }
}