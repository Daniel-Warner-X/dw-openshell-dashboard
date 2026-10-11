import { Fragment, useState } from 'react';
import {
  Badge,
  Button,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadLogo,
  MastheadMain,
  MastheadToggle,
  MenuToggle,
  Nav,
  NavItem,
  NavItemSeparator,
  NavList,
  Page,
  PageSection,
  PageSidebar,
  PageSidebarBody,
  PageToggleButton,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { BarsIcon, MoonIcon, SunIcon } from '@patternfly/react-icons';
import { Link, useLocation } from 'react-router-dom';

import openshellLogo from '~/assets/openshell-logo.svg';
import openshellLogoDark from '~/assets/openshell-logo-dark.svg';
import { useCurrentUser, useFeatureFlags } from '../api/auth';
import { useAllWorkspacesDraftSummary } from '../api/draftSummary';
import { useUserRole } from '../api/rbac';
import CurrentUserModal from '../components/CurrentUserModal';
import GatewayCompatibilityAlert from '../components/GatewayCompatibilityAlert';
import GatewayStatusIndicator from '../components/GatewayStatusIndicator';
import RoleBadge from '../components/RoleBadge';
import { useI18n } from '../i18n';
import { logout } from './logout';
import { useTheme } from './theme';

type AppLayoutProps = {
  children: React.ReactNode;
};

type NavGroupId = 'workspaces' | 'platform';

type NavEntry = {
  path: string;
  labelKey:
    | 'nav.gateway'
    | 'nav.workspaces'
    | 'nav.proposals'
    | 'nav.allWorkspaces'
    | 'nav.providerProfiles'
    | 'nav.globalPolicy'
    | 'nav.settings';
  // The section of the sidebar the entry belongs to. An entry with none sits
  // above the sections, as Gateway does: the dashboard's landing page is not
  // one of a set.
  group?: NavGroupId;
  adminOnly?: boolean;
  featureKey?: keyof import('../types').FeatureFlags;
};

const navGroups: { id: NavGroupId }[] = [
  { id: 'workspaces' },
  { id: 'platform' },
];

const navEntries: NavEntry[] = [
  { path: '/gateway', labelKey: 'nav.gateway', adminOnly: true },
  { path: '/workspaces', labelKey: 'nav.workspaces', group: 'workspaces' },
  {
    path: '/proposals',
    labelKey: 'nav.proposals',
    group: 'workspaces',
    featureKey: 'draftPolicy',
  },
  {
    path: '/all-workspaces',
    labelKey: 'nav.allWorkspaces',
    group: 'workspaces',
    adminOnly: true,
  },
  {
    path: '/provider-profiles',
    labelKey: 'nav.providerProfiles',
    group: 'platform',
    adminOnly: true,
  },
  {
    path: '/global-policy',
    labelKey: 'nav.globalPolicy',
    group: 'platform',
    adminOnly: true,
    featureKey: 'globalPolicy',
  },
  {
    path: '/settings',
    labelKey: 'nav.settings',
    group: 'platform',
    adminOnly: true,
    featureKey: 'settings',
  },
];

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { t } = useI18n('common');
  const location = useLocation();
  const user = useCurrentUser();
  const { isPlatformAdmin, isUser, isLoading: isRoleLoading } = useUserRole();
  const features = useFeatureFlags();
  const [isUserOpen, setUserOpen] = useState(false);
  const [isIdentityOpen, setIdentityOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const logoSrc = theme === 'dark' ? openshellLogoDark : openshellLogo;

  // How many rules are waiting for a decision, on the Proposals entry. Read
  // for a platform admin only, and not because proposals are theirs: this is
  // the shell, mounted on every page, and the gateway's cross-workspace
  // summary is the one shape of this read that is a single request. Reading
  // it the way a standard user has to — one request per workspace they are in
  // — would put that behind every page they open. The page itself does that
  // read, once, where someone is looking at it. The same query the Proposals
  // page uses, so an admin who is on it is not polling it twice.
  const { totalPending: pendingProposals } = useAllWorkspacesDraftSummary(
    features.draftPolicy && isPlatformAdmin,
  );

  const masthead = (
    <Masthead
      display={{ default: 'inline' }}
      className="pf-v6-u-align-items-center"
    >
      <MastheadMain>
        <MastheadToggle>
          <PageToggleButton variant="plain" aria-label={t('nav.global')}>
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
        <MastheadBrand>
          <MastheadLogo
            component={(props) => (
              <Link
                {...props}
                to={isPlatformAdmin ? '/gateway' : '/workspaces'}
                className="pf-v6-u-text-decoration-none"
              />
            )}
          >
            <img
              src={logoSrc}
              alt={t('about.brandAlt')}
              style={{ height: 'var(--pf-t--global--spacer--2xl)' }}
            />
          </MastheadLogo>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <Toolbar isFullHeight isStatic aria-label={t('header.actions')}>
          <ToolbarContent>
            <ToolbarItem align={{ default: 'alignEnd' }} alignSelf="center">
              <GatewayStatusIndicator />
            </ToolbarItem>
            <ToolbarItem>
              <Button
                variant="plain"
                onClick={toggleTheme}
                aria-label={
                  theme === 'dark'
                    ? t('header.themeToLight')
                    : t('header.themeToDark')
                }
                data-testid="theme-toggle"
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </Button>
            </ToolbarItem>
            {!isRoleLoading && (isPlatformAdmin || isUser) && (
              <ToolbarItem alignSelf="center">
                <RoleBadge
                  isPlatformAdmin={isPlatformAdmin}
                  isUser={isUser}
                  isLoading={isRoleLoading}
                />
              </ToolbarItem>
            )}
            <ToolbarItem>
              <Dropdown
                isOpen={isUserOpen}
                onSelect={() => setUserOpen(false)}
                onOpenChange={setUserOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    // Without a variant PatternFly gives this a bordered
                    // button, beside a status indicator and a theme toggle
                    // that are both plain. plainText keeps the caret and
                    // drops the border.
                    variant="plainText"
                    onClick={() => setUserOpen(!isUserOpen)}
                    isExpanded={isUserOpen}
                    data-testid="current-user"
                  >
                    {user.data?.displayName ||
                      user.data?.subject ||
                      t('header.userFallback')}
                  </MenuToggle>
                )}
                popperProps={{ position: 'end' }}
              >
                <DropdownList>
                  {user.data?.subject && (
                    <DropdownItem
                      key="copy-subject"
                      onClick={() => {
                        navigator.clipboard.writeText(user.data!.subject);
                      }}
                      data-testid="copy-subject"
                    >
                      {t('header.copySubject')}
                    </DropdownItem>
                  )}
                  <DropdownItem
                    key="identity"
                    onClick={() => setIdentityOpen(true)}
                    data-testid="view-identity"
                  >
                    {t('header.identity')}
                  </DropdownItem>
                  <Divider key="divider" />
                  <DropdownItem
                    key="logout"
                    onClick={() => logout()}
                    data-testid="logout"
                  >
                    {t('header.logOut')}
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </MastheadContent>
    </Masthead>
  );

  const visibleEntries = navEntries.filter(
    (e) =>
      (!e.adminOnly || isPlatformAdmin) &&
      (!e.featureKey || features[e.featureKey]),
  );
  const groupedEntries = navGroups
    .map((group) => ({
      ...group,
      entries: visibleEntries.filter((entry) => entry.group === group.id),
    }))
    .filter((group) => group.entries.length > 0);
  // A rule above the only section there is would divide the sidebar from
  // nothing. Rules earn their place once a user can see more than one section
  // — a standard user, who sees only their workspaces, gets the flat list
  // they had.
  const hasSections = groupedEntries.length > 1;

  const navItem = (entry: NavEntry) => (
    <NavItem
      key={entry.path}
      itemId={entry.path}
      to={entry.path}
      isActive={location.pathname.startsWith(entry.path)}
      component={(props) => <Link {...props} to={entry.path} />}
    >
      {t(entry.labelKey)}
      {entry.path === '/proposals' && pendingProposals > 0 && (
        <Badge isRead className="pf-v6-u-ml-sm" data-testid="proposals-badge">
          {pendingProposals}
        </Badge>
      )}
    </NavItem>
  );

  const sidebar = (
    <PageSidebar>
      <PageSidebarBody>
        <Nav aria-label={t('nav.primary')}>
          <NavList>
            {visibleEntries.filter((entry) => !entry.group).map(navItem)}
            {groupedEntries.map((group) =>
              hasSections ? (
                // A rule above each section, so the entries below it read as
                // starting there rather than as more of the set above.
                <Fragment key={group.id}>
                  <NavItemSeparator data-testid="nav-section-rule" />
                  {group.entries.map(navItem)}
                </Fragment>
              ) : (
                group.entries.map(navItem)
              ),
            )}
          </NavList>
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  );

  return (
    <Page masthead={masthead} sidebar={sidebar} isManagedSidebar>
      {/* Above every route, so an unsupported gateway is explained on the
          same screen as the errors it causes, for every signed-in user. It
          lives here rather than in a page so that it stays mounted across
          navigation and is announced once, when it appears. The title is not
          a heading: it sits above each page's h1, where a heading would break
          the outline. Wrapped in a section only when shown. */}
      <GatewayCompatibilityAlert
        component="div"
        wrapper={(alert) => <PageSection>{alert}</PageSection>}
      />
      {children}
      <CurrentUserModal
        user={user.data}
        isOpen={isIdentityOpen}
        onClose={() => setIdentityOpen(false)}
      />
    </Page>
  );
};

export default AppLayout;
