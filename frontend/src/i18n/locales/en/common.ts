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
    help: 'Help',
    documentation: 'Documentation',
    // No longer used: the About modal retired into the Gateway page, which
    // says everything it did. The key stays — a locale is published API.
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
    healthy: 'Gateway healthy',
    notHealthy: 'Gateway not healthy',
    unreachable: 'Gateway unreachable',
    unknown: 'Gateway status unknown',
  },
  actions: {
    retry: 'Retry',
  },
} as const;
