import { existsSync, readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { safeDestr } from 'destr'
import { app } from 'electron'
import { throttle } from 'es-toolkit'

function parseOrFallback<T>(config: string, fallback: T | undefined): T | undefined {
  try {
    // Try to parse the config, but handle malformed JSON gracefully
    const parsed = safeDestr<T>(config)
    return parsed || fallback
  }
  catch (error) {
    console.error('Failed to parse config file, using fallback:', error)
    // If parsing fails, return fallback and the file will be overwritten on next save
    return fallback
  }
}

const persistenceMap = new Map<string, any>()

export function createConfig<T>(namespace: string, filename: string, options?: { default?: T }) {
  function configPath() {
    const path = join(app.getPath('userData'), `${namespace}-${filename}`)
    return path
  }

  function setup() {
    const path = configPath()
    const data = existsSync(path)
      ? parseOrFallback<T>(readFileSync(configPath(), { encoding: 'utf-8' }), options?.default)
      : options?.default
    persistenceMap.set(`${namespace}-${filename}`, data)
  }

  const save = throttle(async () => {
    try {
      await writeFile(configPath(), JSON.stringify(persistenceMap.get(`${namespace}-${filename}`)))
    }
    catch (e) {
      console.error('Failed to save config', e)
    }
  }, 250)

  function update(newData: T) {
    persistenceMap.set(`${namespace}-${filename}`, newData)
    save()
  }

  function get(): T | undefined {
    return persistenceMap.get(`${namespace}-${filename}`) as T | undefined
  }

  return {
    setup,
    get,
    update,
  }
}
