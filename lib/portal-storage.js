import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), '.data', 'portal')

async function ensureDir() {
  try { await mkdir(DATA_DIR, { recursive: true }) } catch {}
}

async function readJSON(file) {
  try {
    const raw = await readFile(join(DATA_DIR, file), 'utf-8')
    return JSON.parse(raw)
  } catch { return null }
}

async function writeJSON(file, data) {
  await ensureDir()
  await writeFile(join(DATA_DIR, file), JSON.stringify(data, null, 2))
}

export async function getProjects() {
  return (await readJSON('projects.json')) || []
}

export async function getProject(id) {
  const projects = await getProjects()
  return projects.find(p => p.id === id) || null
}

export async function createProject(project) {
  const projects = await getProjects()
  projects.push(project)
  await writeJSON('projects.json', projects)
  return project
}

export async function updateProject(id, updates) {
  const projects = await getProjects()
  const idx = projects.findIndex(p => p.id === id)
  if (idx === -1) return null
  projects[idx] = { ...projects[idx], ...updates }
  await writeJSON('projects.json', projects)
  return projects[idx]
}

export async function deleteProject(id) {
  let projects = await getProjects()
  projects = projects.filter(p => p.id !== id)
  await writeJSON('projects.json', projects)
}

export async function getFeedback(projectId) {
  const all = (await readJSON('feedback.json')) || {}
  return all[projectId] || {}
}

export async function saveFeedback(projectId, itemId, data) {
  const all = (await readJSON('feedback.json')) || {}
  if (!all[projectId]) all[projectId] = {}
  all[projectId][itemId] = { ...all[projectId][itemId], ...data, updatedAt: new Date().toISOString() }
  await writeJSON('feedback.json', all)
  return all[projectId][itemId]
}
