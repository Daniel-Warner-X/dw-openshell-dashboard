import {
  Alert,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  ExpandableSection,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Icon,
  Label,
  LabelGroup,
  List,
  ListItem,
  PageSection,
  ProgressStep,
  ProgressStepper,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';

import {
  useAllProviders,
  useAllSandboxes,
  useAllServices,
  useAllTemplates,
} from '../api/allWorkspaces';
import { useFeatureFlags } from '../api/auth';
import { useAllWorkspacesDraftSummary } from '../api/draftSummary';
import { useGatewayCompatibility, useGatewayInfo } from '../api/gateway';
import { useGlobalPolicy } from '../api/policy';
import { useGlobalSettings } from '../api/settings';
import { useWorkspaces } from '../api/workspaces';
import { APP_VERSION } from '../constants';
import type { GatewayCompatibility, GatewayExtensionKind } from '../types';

// The BFF's verdict on the gateway, in a few words. The notice that explains
// what an unsupported gateway does to the rest of the dashboard is the one
// the app shell raises above every page; this only states where the gateway
// sits, beside the version it is a verdict on.
const compatibilityText = (compatibility?: GatewayCompatibility): string => {
  if (!compatibility) {
    return 'Not known';
  }
  const { supportedMin: min, supportedMax: max } = compatibility;
  const range = min && max ? (min === max ? min : `${min} to ${max}`) : '';
  switch (compatibility.status) {
    case 'supported':
      return range ? `Supported (${range})` : 'Supported';
    case 'untested':
      return range ? `Newer than tested (${range})` : 'Newer than tested';
    case 'unsupported':
      return range ? `Older than supported (${range})` : 'Older than supported';
    default:
      return 'Not known';
  }
};

const EXTENSION_KIND_LABELS: Record<GatewayExtensionKind, string> = {
  COMPUTE_DRIVER: 'Compute driver',
  CREDENTIAL_DRIVER: 'Credential driver',
  GATEWAY_INTERCEPTOR: 'Gateway interceptor',
  SUPERVISOR_MIDDLEWARE: 'Supervisor middleware',
  UNSPECIFIED: 'Unspecified',
};

// A kind this build has no name for is shown as the gateway spelled it.
const extensionKindLabel = (kind: string): string =>
  (EXTENSION_KIND_LABELS as Record<string, string | undefined>)[kind] ?? kind;

const CapabilityList: React.FC<{ capabilities?: string[] }> = ({
  capabilities,
}) =>
  capabilities && capabilities.length > 0 ? (
    <LabelGroup numLabels={4}>
      {capabilities.map((capability) => (
        <Label key={capability} color="grey" isCompact>
          {capability}
        </Label>
      ))}
    </LabelGroup>
  ) : (
    <>-</>
  );

// How many of something there are, or undefined when that cannot be said.
// The four lists across workspaces are answered for platform admins only and
// the gateway refuses everyone else (403), so a refusal, and a list that has
// not arrived, must not be shown as a zero: the tile is left out instead.
const countOf = (query: {
  data?: unknown[];
  isError: boolean;
}): number | undefined =>
  query.isError || !query.data ? undefined : query.data.length;

type CardRow = {
  label: string;
  value: string | number;
  // Where the value leads, where it leads anywhere. A count is a link to the
  // page it was read from; a fact about the gateway is not.
  to?: string;
  testId: string;
};

// One row of a card's list, after PatternFly's own dashboard cards: what it
// is on the left, what it says on the right, ruled off from the row below and
// from the card's heading above. A link whose text is a bare figure says
// nothing on its own, so it carries the name of what it counts as its label.
const CardListRow: React.FC<CardRow> = ({ label, value, to, testId }) => (
  <DataListItem aria-labelledby={`${testId}-label`}>
    <DataListItemRow>
      <DataListItemCells
        dataListCells={[
          <DataListCell key="label" id={`${testId}-label`}>
            {label}
          </DataListCell>,
          <DataListCell
            key="value"
            isFilled={false}
            alignRight
            data-testid={testId}
          >
            {to ? (
              <Link to={to} aria-label={`${label}: ${value}`}>
                {value}
              </Link>
            ) : (
              value
            )}
          </DataListCell>,
        ]}
      />
    </DataListItemRow>
  </DataListItem>
);

// Gateway overview — the dashboard's landing page for a platform admin. It
// answers, in this order: is the gateway well, is anything waiting for me,
// and how much is on it. The gateway's own four facts (status, version,
// compute drivers and the extensions it negotiated — GetGatewayInfoResponse
// is all there is) stay, the two tables a fold below. The API exposes no time
// series, no utilisation and no event feed, so there is nothing to chart.
const GatewayOverviewPage: React.FC = () => {
  const gateway = useGatewayInfo();
  const compatibility = useGatewayCompatibility();
  const features = useFeatureFlags();
  const workspaces = useWorkspaces();
  const sandboxes = useAllSandboxes();
  const providers = useAllProviders();
  const templates = useAllTemplates();
  const services = useAllServices({ enabled: features.services });
  const globalPolicy = useGlobalPolicy(features.globalPolicy);
  const settings = useGlobalSettings(features.settings);
  // The same query the shell's Proposals badge reads, so this costs the
  // gateway nothing beyond what the badge already asks for.
  const proposals = useAllWorkspacesDraftSummary(features.draftPolicy);

  if (gateway.isLoading) {
    return (
      <PageSection>
        <Bullseye>
          <Spinner aria-label="Loading gateway info" />
        </Bullseye>
      </PageSection>
    );
  }

  if (gateway.isError) {
    return (
      <PageSection>
        <Alert
          variant="danger"
          title="Cannot reach the OpenShell gateway"
          actionLinks={
            <Button variant="link" onClick={() => gateway.refetch()}>
              Retry
            </Button>
          }
        >
          {(gateway.error as Error).message}
        </Alert>
      </PageSection>
    );
  }

  const info = gateway.data;
  // Absent from a BFF that predates the field.
  const extensions = info?.extensions ?? [];

  const workspaceCount = countOf(workspaces);
  const sandboxCount = countOf(sandboxes);
  const providerCount = countOf(providers);
  const templateCount = countOf(templates);
  const serviceCount = features.services ? countOf(services) : undefined;
  // activeVersion is zero when no global policy is in force; a history of
  // revisions is not a policy.
  const policyInForce =
    !features.globalPolicy || globalPolicy.isError || !globalPolicy.data
      ? undefined
      : (globalPolicy.data.activeVersion ?? 0) > 0;
  // Every registered key comes back from the gateway, and one that was never
  // set comes back with no value at all. What is worth counting is the ones
  // somebody changed.
  const settingCount =
    !features.settings || settings.isError || !settings.data
      ? undefined
      : settings.data.settings.filter((entry) => entry.value !== undefined)
          .length;

  const details: CardRow[] = [
    {
      label: 'Gateway version',
      value: info?.gatewayVersion || '-',
      testId: 'gateway-version',
    },
    {
      label: 'Dashboard version',
      value: APP_VERSION,
      testId: 'dashboard-version',
    },
    {
      label: 'Compatibility',
      value: compatibilityText(
        compatibility.data?.compatibility ?? info?.compatibility,
      ),
      testId: 'gateway-compatibility',
    },
  ];

  const inventory: CardRow[] = [];
  if (workspaceCount !== undefined) {
    inventory.push({
      label: 'Workspaces',
      value: workspaceCount,
      to: '/workspaces',
      testId: 'gateway-count-workspaces',
    });
  }
  if (sandboxCount !== undefined) {
    inventory.push({
      label: 'Sandboxes',
      value: sandboxCount,
      to: '/all-workspaces',
      testId: 'gateway-count-sandboxes',
    });
  }
  if (providerCount !== undefined) {
    inventory.push({
      label: 'Providers',
      value: providerCount,
      to: '/all-workspaces',
      testId: 'gateway-count-providers',
    });
  }
  if (templateCount !== undefined) {
    inventory.push({
      label: 'Templates',
      value: templateCount,
      to: '/all-workspaces',
      testId: 'gateway-count-templates',
    });
  }
  if (serviceCount !== undefined) {
    inventory.push({
      label: 'Services',
      value: serviceCount,
      to: '/all-workspaces',
      testId: 'gateway-count-services',
    });
  }
  if (policyInForce !== undefined) {
    inventory.push({
      label: 'Global policy',
      value: policyInForce ? 'In force' : 'None',
      to: '/global-policy',
      testId: 'gateway-count-global-policy',
    });
  }
  if (settingCount !== undefined) {
    inventory.push({
      label: 'Custom settings',
      value: settingCount,
      to: '/settings',
      testId: 'gateway-count-settings',
    });
  }

  // Nothing has been made on this gateway yet. A workspace is not the test:
  // a gateway starts with `default`, so one that has only workspaces has
  // still not been used for anything.
  const isEmpty = sandboxCount === 0 && providerCount === 0;
  // An empty gateway is walked through getting started instead of counted,
  // and a user the gateway refuses the cross-workspace lists to has nothing
  // to count. Either way the top row is two columns, not three.
  const showInventory = !isEmpty && inventory.length > 0;

  const erroredSandboxes = (sandboxes.data ?? []).filter(
    (sandbox) => sandbox.status.phase === 'ERROR',
  );
  // What is worth doing something about, each row leading to where it is
  // done. The gateway's own version verdict is not repeated here: it is in
  // the strip above, and the app shell raises a notice above every page when
  // it is a problem.
  const attention: { key: string; text: string; to: string }[] = [];
  // First: a rule an agent proposed is a sandbox held up until somebody
  // decides on it.
  if (proposals.totalPending > 0) {
    attention.push({
      key: 'proposals',
      text: `${proposals.totalPending} policy ${
        proposals.totalPending === 1 ? 'rule' : 'rules'
      } waiting for a decision`,
      to: '/proposals',
    });
  }
  if (erroredSandboxes.length > 0) {
    attention.push({
      key: 'errored',
      text: `${erroredSandboxes.length} sandbox${
        erroredSandboxes.length === 1 ? '' : 'es'
      } in error`,
      to: '/all-workspaces',
    });
  }
  if (!isEmpty && providerCount === 0) {
    attention.push({
      key: 'no-providers',
      text: 'No providers — sandboxes have no credentials to reach a model or a service',
      to: '/all-workspaces',
    });
  }

  return (
    <>
      <PageSection>
        <Title headingLevel="h1" className="pf-v6-u-mb-sm">
          Gateway
        </Title>
        <Content component="p">
          Admin view of status, inventory, and alerts.
        </Content>
      </PageSection>
      <PageSection>
        {/* One grid for the whole page, so the blocks are separated by a
            gutter rather than by a page section's padding each. The top row
            answers, left to right, the questions that are asked on arrival:
            is the gateway well, what is on it, and is anything waiting. */}
        <Grid hasGutter>
          <GridItem lg={showInventory ? 5 : 8} md={12}>
            <Card isFullHeight data-testid="gateway-status-card">
              <CardTitle component="h2">Details</CardTitle>
              {/* The same list the inventory is, so the two cards of the row
                  read as one thing said twice over rather than as two. The
                  gateway's health is not among these: it is in the masthead,
                  on every page, and saying it again a fold below itself is
                  the same fact twice. */}
              <DataList aria-label="Details" isCompact gridBreakpoint="none">
                {details.map((item) => (
                  <CardListRow key={item.testId} {...item} />
                ))}
              </DataList>
            </Card>
          </GridItem>
          {showInventory && (
            <GridItem lg={3} md={6}>
              <Card isFullHeight data-testid="gateway-counts">
                <CardTitle component="h2">Inventory</CardTitle>
                {/* Rows rather than tiles, after PatternFly's own dashboard
                    inventory card. The list is a direct child of the card and
                    not of a body, so each rule runs the card's full width
                    instead of stopping short of its padding. A column rather
                    than a band across the page: a figure right-aligned at the
                    far edge of a full-width card is a long way from the name
                    of what it counts. */}
                <DataList
                  aria-label="Inventory"
                  isCompact
                  gridBreakpoint="none"
                >
                  {inventory.map((item) => (
                    <CardListRow key={item.testId} {...item} />
                  ))}
                </DataList>
              </Card>
            </GridItem>
          )}
          {/* The last column either carries what is waiting or says that
              nothing is, so the row is whole either way. */}
          <GridItem lg={4} md={6}>
            {attention.length > 0 ? (
              <Alert
                variant="warning"
                isInline
                title="Needs attention"
                component="h2"
                data-testid="gateway-attention"
              >
                <List isPlain>
                  {attention.map((item) => (
                    <ListItem key={item.key}>
                      <Link to={item.to}>{item.text}</Link>
                    </ListItem>
                  ))}
                </List>
              </Alert>
            ) : (
              <Card isFullHeight isPlain data-testid="gateway-all-clear">
                <CardBody>
                  <Flex
                    alignItems={{ default: 'alignItemsCenter' }}
                    gap={{ default: 'gapSm' }}
                  >
                    <FlexItem>
                      <Icon status="success">
                        <CheckCircleIcon />
                      </Icon>
                    </FlexItem>
                    <FlexItem>
                      <Content component="p">Nothing needs attention</Content>
                    </FlexItem>
                  </Flex>
                </CardBody>
              </Card>
            )}
          </GridItem>
          {isEmpty && (
            <GridItem span={12}>
              <Card data-testid="gateway-get-started">
                <CardTitle>Get started</CardTitle>
                <CardBody>
                  <Content component="p">
                    Nothing has been created on this gateway yet. Three steps
                    make a sandbox an agent can work in.
                  </Content>
                  <ProgressStepper isVertical aria-label="Getting started">
                    <ProgressStep
                      id="get-started-workspace"
                      titleId="get-started-workspace-title"
                      variant="info"
                      isCurrent
                      description="A workspace holds a team's sandboxes, providers and members. The gateway starts with one called default."
                    >
                      <Link to="/workspaces">Create a workspace</Link>
                    </ProgressStep>
                    <ProgressStep
                      id="get-started-provider"
                      titleId="get-started-provider-title"
                      variant="pending"
                      description="A provider holds the credentials a sandbox uses to reach a model or a service. Its type comes from a provider profile."
                    >
                      <Link to="/workspaces">Add a provider</Link>
                    </ProgressStep>
                    <ProgressStep
                      id="get-started-sandbox"
                      titleId="get-started-sandbox-title"
                      variant="pending"
                      description="A sandbox is a secure execution environment, governed by the security policy it is created with. Attach the providers it may use."
                    >
                      <Link to="/workspaces">Create a sandbox</Link>
                    </ProgressStep>
                  </ProgressStepper>
                </CardBody>
              </Card>
            </GridItem>
          )}
          <GridItem span={12}>
            <ExpandableSection
              toggleText={`Compute drivers (${(info?.computeDrivers ?? []).length})`}
              data-testid="gateway-drivers-expand"
            >
              <Card data-testid="gateway-drivers-card">
                <CardBody>
                  <Table aria-label="Compute drivers" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Driver</Th>
                        <Th>Version</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {(info?.computeDrivers ?? []).map((driver) => (
                        <Tr key={driver.name}>
                          <Td dataLabel="Name">{driver.name}</Td>
                          <Td dataLabel="Driver">{driver.driverName || '-'}</Td>
                          <Td dataLabel="Version">
                            {driver.driverVersion || '-'}
                          </Td>
                        </Tr>
                      ))}
                      {(info?.computeDrivers ?? []).length === 0 && (
                        <Tr>
                          <Td colSpan={3}>No compute drivers reported</Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </ExpandableSection>
            <ExpandableSection
              toggleText={`Extensions (${extensions.length})`}
              data-testid="gateway-extensions-expand"
            >
              <Card data-testid="gateway-extensions-card">
                <CardBody>
                  <Table aria-label="Extensions" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Kind</Th>
                        <Th>Implementation</Th>
                        <Th>Protocol</Th>
                        <Th>Capabilities</Th>
                        <Th>Requires from gateway</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {extensions.map((extension) => (
                        <Tr
                          key={`${extension.kind}/${extension.configuredName}`}
                        >
                          <Td dataLabel="Name">
                            {extension.configuredName || '-'}
                          </Td>
                          <Td dataLabel="Kind">
                            {extensionKindLabel(extension.kind)}
                          </Td>
                          <Td dataLabel="Implementation">
                            {[
                              extension.implementationName,
                              extension.implementationVersion,
                            ]
                              .filter(Boolean)
                              .join(' ') || '-'}
                          </Td>
                          <Td dataLabel="Protocol">
                            {extension.protocolMajor}.{extension.protocolMinor}
                          </Td>
                          <Td dataLabel="Capabilities">
                            <CapabilityList
                              capabilities={extension.supportedCapabilities}
                            />
                          </Td>
                          <Td dataLabel="Requires from gateway">
                            <CapabilityList
                              capabilities={extension.requiredCapabilities}
                            />
                          </Td>
                        </Tr>
                      ))}
                      {extensions.length === 0 && (
                        <Tr>
                          <Td colSpan={6}>No extensions reported</Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </ExpandableSection>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
};

export default GatewayOverviewPage;
