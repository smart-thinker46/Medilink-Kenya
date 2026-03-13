const base = require('./app.json').expo;

const isStaging = process.env.APP_VARIANT === 'staging';
const stagingProjectId = process.env.EXPO_STAGING_PROJECT_ID;

if (isStaging && !stagingProjectId) {
  throw new Error('EXPO_STAGING_PROJECT_ID is required when APP_VARIANT=staging');
}

const projectId = isStaging ? stagingProjectId : base?.extra?.eas?.projectId;
const name = isStaging ? `${base.name} Staging` : base.name;
const slug = isStaging ? `${base.slug}-staging` : base.slug;
const scheme = isStaging ? `${base.scheme}-staging` : base.scheme;
const androidPackage = isStaging
  ? `${base.android.package}.staging`
  : base.android.package;
const iosBundleIdentifier = isStaging
  ? `${base.ios.bundleIdentifier}.staging`
  : base.ios.bundleIdentifier;

module.exports = {
  ...base,
  name,
  slug,
  scheme,
  android: {
    ...base.android,
    package: androidPackage,
  },
  ios: {
    ...base.ios,
    bundleIdentifier: iosBundleIdentifier,
  },
  updates: {
    ...base.updates,
    url: projectId ? `https://u.expo.dev/${projectId}` : base?.updates?.url,
  },
  extra: {
    ...base.extra,
    eas: {
      ...(base?.extra?.eas || {}),
      projectId,
    },
  },
};
