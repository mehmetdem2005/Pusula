const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Monorepo: workspace'teki diğer paketleri görebilmek için
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.disableHierarchicalLookup = true

// Workspace paketleri (@kavra/*) kaynak .ts'yi TS-ESM stili '.js' uzantisiyla
// import ediyor (or. './types.js' -> gercekte types.ts). tsx bunu cozer ama
// Metro cozmez; once '.js'i dene, bulamazsan uzantiyi atip .ts'e dus.
const baseResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = baseResolveRequest ?? context.resolveRequest
  if ((moduleName.startsWith('./') || moduleName.startsWith('../')) && moduleName.endsWith('.js')) {
    try {
      return resolve(context, moduleName, platform)
    } catch {
      return resolve(context, moduleName.slice(0, -3), platform)
    }
  }
  return resolve(context, moduleName, platform)
}

module.exports = withNativeWind(config, { input: './global.css' })
