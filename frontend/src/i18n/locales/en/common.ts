export default {
  nav: {
    gateway: 'Gateway',
    workspaces: 'Workspaces',
    // The page lists sandboxes, providers, templates and services across
    // every workspace — resources, not workspaces, which is the question
    // "what is the difference between Workspaces and All workspaces?" that
    // the old label invited.
    allWorkspaces: 'All resources',
    proposals: 'Proposals',
    providerProfiles: 'Provider profiles',
    globalPolicy: 'Global policy',
    settings: 'Settings',
    primary: 'Primary navigation',
    global: 'Global navigation',
    groupWorkspaces: 'Workspaces',
    groupPlatform: 'Platform',
  },
  header: {
    actions: 'Header actions',
    themeToLight: 'Switch to light theme',
    themeToDark: 'Switch to dark theme',
    // No longer used, and kept all the same — a locale is published API.
    // The About modal retired into the Gateway page, which says everything
    // it did, and the help menu went with the last item it had left.
    help: 'Help',
    documentation: 'Documentation',
    about: 'About',
    roleAdmin: 'Platform admin',
    roleUser: 'Standard user',
    userFallback: 'User',
    copySubject: 'Copy my subject ID',
    identity: 'My identity',
    logOut: 'Log out',
  },
  identity: {
    title: 'Signed-in identity',
    subject: 'Subject',
    name: 'Name',
    provider: 'Identity provider',
    roles: 'Roles',
    scopes: 'Scopes',
    none: 'None',
    close: 'Close',
  },
  // Only brandAlt is still shown, on the masthead logo. The rest belonged to
  // the About modal, which retired into the Gateway page. The keys stay: a
  // locale is published API (ADR 0004), and a consumer may have overridden
  // them.
  about: {
    productName: 'OpenShell Dashboard',
    trademark: 'Apache-2.0 license.',
    brandAlt: 'OpenShell Dashboard',
    dashboardVersion: 'Dashboard version',
    gatewayVersion: 'Gateway version',
    gatewayStatus: 'Gateway status',
    computeDriver: 'Compute driver',
    unknown: 'Unknown',
  },
  gatewayCompatibility: {
    // Fills {{supported}} below when the range spans more than one version.
    versionRange: '{{min}} to {{max}}',
    unsupported: {
      title: 'This gateway is older than this dashboard supports',
      body: 'The gateway reports version {{version}}. Supported gateway versions: {{supported}}. Pages might fail to load or show errors that do not explain the cause. Upgrade the gateway to a supported version, or use a dashboard release that supports gateway {{version}}.',
    },
    untested: {
      title: 'This gateway is newer than this dashboard was tested with',
      body: 'The gateway reports version {{version}}. Tested gateway versions: {{supported}}. The dashboard may work as expected, but some pages might not.',
      dismiss: 'Dismiss gateway version notice',
    },
  },
  // What the gateway's own health check says, shown in the masthead.
  gatewayHealth: {
    // What the label beside it is the value of. The states no longer name
    // the gateway themselves, and they are cased as the Gateway page cases
    // the same status, which is as the gateway itself sends it.
    label: 'Gateway status:',
    healthy: 'HEALTHY',
    notHealthy: 'NOT HEALTHY',
    unreachable: 'UNREACHABLE',
    unknown: 'UNKNOWN',
  },
  actions: {
    retry: 'Retry',
  },
} as const;
