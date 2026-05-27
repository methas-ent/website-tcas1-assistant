const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  path.resolve(workspaceRoot, "packages/shared"),
  path.resolve(workspaceRoot, "packages/api-client"),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Hard-alias React + React-DOM to mobile's copy. resolveRequest beats package
// hierarchy so react-native's internal `require('react')` cannot pick root's
// React 18.
const reactPath = path.resolve(projectRoot, "node_modules/react");
const reactDomPath = path.resolve(projectRoot, "node_modules/react-dom");
const reactJsxRuntimePath = path.resolve(
  projectRoot,
  "node_modules/react/jsx-runtime.js",
);
const reactJsxDevRuntimePath = path.resolve(
  projectRoot,
  "node_modules/react/jsx-dev-runtime.js",
);

const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react") {
    return { type: "sourceFile", filePath: path.join(reactPath, "index.js") };
  }
  if (moduleName === "react/jsx-runtime") {
    return { type: "sourceFile", filePath: reactJsxRuntimePath };
  }
  if (moduleName === "react/jsx-dev-runtime") {
    return { type: "sourceFile", filePath: reactJsxDevRuntimePath };
  }
  if (moduleName === "react-dom") {
    return { type: "sourceFile", filePath: path.join(reactDomPath, "index.js") };
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
