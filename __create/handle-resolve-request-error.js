const path = require('node:path');
const { reportErrorToRemote } = require('./report-error-to-remote');

const VIRTUAL_ROOT = path.join(__dirname, '../metro-virtual');
const VIRTUAL_ROOT_UNRESOLVED = path.join(VIRTUAL_ROOT, 'unresolved');

const handleResolveRequestError = ({ error, context, moduleName, platform }) => {
  const errorMessage = `Unable to resolve module '${moduleName}' from '${context.originModulePath}'`;
  const syntheticError = new Error(errorMessage);
  syntheticError.stack = error.stack;
  reportErrorToRemote({ error: syntheticError }).catch((reportError) => {
    // no-op
  });
  // Allow Metro to surface the original missing-module error (more actionable).
  throw error;
};

module.exports = {
  handleResolveRequestError,
  VIRTUAL_ROOT,
  VIRTUAL_ROOT_UNRESOLVED,
};
