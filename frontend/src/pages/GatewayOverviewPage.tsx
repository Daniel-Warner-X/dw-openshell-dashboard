import { useState } from 'react';
import {
  Alert,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  DataList,
  DataListCell,
  DataListItem,
  DataListItemCells,
  DataListItemRow,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Icon,
  Label,
  LabelGroup,
  MenuToggle,
  PageSection,
  ProgressStep,
  ProgressStepper,
  Spinner,
  Title,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from '@patternfly/react-icons';
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
import type {
  DraftSandboxSummary,
  GatewayCompatibility,
  GatewayExtensionKind,
} from '../types';

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

// The icon beside a line in Needs attention. Danger is something that has
// already gone wrong; warning is something that will unless it is dealt
// with. The same two the masthead's health indicator uses, so one shape
// means one thing across the page.
const ATTENTION_ICON = {
  danger: <ExclamationCircleIcon />,
  warning: <ExclamationTriangleIcon />,
} as const;

// The three kinds of thing that can be waiting, which are also what the
// card's filter offers. A kind with nothing in it is not offered.
const ATTENTION_TYPES = ['proposals', 'errors', 'setup'] as const;

type AttentionType = (typeof ATTENTION_TYPES)[number];

const ATTENTION_TYPE_LABEL: Record<AttentionType, string> = {
  proposals: 'Proposals',
  errors: 'Sandbox errors',
  setup: 'Setup',
};

// One line of Needs attention: the thing it is about, named, and a sentence
// saying what is wrong with it.
type AttentionItem = {
  key: string;
  type: AttentionType;
  status: 'warning' | 'danger';
  // The name of the thing, which is the link. A sandbox is named rather than
  // counted: "3 sandboxes in error" is not something anybody can act on
  // without first finding out which three.
  text: string;
  detail: string;
  to: string;
};

// How many of one kind are named before the rest become a line of their own.
// A gateway with forty sandboxes in error would otherwise be a column forty
// rows long on the page that is meant to be read first.
const ATTENTION_PER_TYPE = 4;

// Caps one kind of item, naming what it left out rather than dropping it
// quietly. `overflow` is the line that stands for the rest.
const cappedByType = (
  items: AttentionItem[],
  overflow: (hidden: number) => AttentionItem,
): AttentionItem[] =>
  items.length > ATTENTION_PER_TYPE
    ? [
        ...items.slice(0, ATTENTION_PER_TYPE),
        overflow(items.length - ATTENTION_PER_TYPE),
      ]
    : items;

// A sandbox whose proposal inbox could not be read comes first: nothing is
// known about it, which is worth more than a known count. Then the ones the
// prover flagged, then the most recently proposed. The same order the
// Proposals page puts them in.
const byProposalUrgency = (a: DraftSandboxSummary, b: DraftSandboxSummary) => {
  if (!!a.unavailable !== !!b.unavailable) return a.unavailable ? -1 : 1;
  if (a.hasSecurityFlags !== b.hasSecurityFlags) {
    return a.hasSecurityFlags ? -1 : 1;
  }
  return b.latestDraftMs - a.latestDraftMs;
};

const sandboxPath = (workspace: string, name: string, tab: string) =>
  `/workspaces/${encodeURIComponent(workspace)}/sandboxes/${encodeURIComponent(name)}?tab=${tab}`;

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
  // Which kind of thing Needs attention is showing. Every hook runs before
  // the early returns below, so this one does too.
  const [attentionType, setAttentionType] = useState<AttentionType | 'all'>(
    'all',
  );
  const [isTypeOpen, setTypeOpen] = useState(false);

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
  //
  // After PatternFly's own dashboard events card: a status icon and a short
  // title that is the link, then a sentence under it saying what the title
  // means and what is to be done about it. The headline alone is a count
  // without a consequence, which is what the old bulleted alert was.
  const attention: AttentionItem[] = [];
  // First: a rule an agent proposed is a sandbox held up until somebody
  // decides on it. One line per sandbox, named, because approving is done in
  // that sandbox's own inbox and nowhere else (hard fact 25) — a line that
  // only counted them led to a page that counts them again.
  const pendingSandboxes = [...proposals.items]
    .filter((entry) => entry.unavailable || entry.pendingCount > 0)
    .sort(byProposalUrgency);
  attention.push(
    ...cappedByType(
      pendingSandboxes.map((entry) => ({
        key: `proposals-${entry.workspace}/${entry.sandboxName}`,
        type: 'proposals' as const,
        status: entry.hasSecurityFlags
          ? ('danger' as const)
          : ('warning' as const),
        text: entry.sandboxName,
        detail: entry.unavailable
          ? `Its proposal inbox in ${entry.workspace} could not be read, so what is waiting in it is not known.`
          : `${entry.pendingCount} policy ${
              entry.pendingCount === 1 ? 'rule' : 'rules'
            } waiting for a decision in ${entry.workspace}${
              entry.hasSecurityFlags ? ', flagged by the prover' : ''
            }.`,
        to: sandboxPath(entry.workspace, entry.sandboxName, 'proposals'),
      })),
      (hidden) => ({
        key: 'proposals-more',
        type: 'proposals' as const,
        status: 'warning' as const,
        text: `${hidden} more ${hidden === 1 ? 'sandbox' : 'sandboxes'} with proposals`,
        detail: 'Every sandbox with a rule waiting is on the Proposals page.',
        to: '/proposals',
      }),
    ),
  );
  // A summary that carries a total but no sandboxes is still worth saying;
  // all it can do is lead to the page that lists them.
  if (pendingSandboxes.length === 0 && proposals.totalPending > 0) {
    attention.push({
      key: 'proposals',
      type: 'proposals',
      status: 'warning',
      text: `${proposals.totalPending} policy ${
        proposals.totalPending === 1 ? 'rule' : 'rules'
      } waiting for a decision`,
      detail: `An agent proposed ${
        proposals.totalPending === 1 ? 'it' : 'them'
      }. Each takes effect only once somebody approves it.`,
      to: '/proposals',
    });
  }
  attention.push(
    ...cappedByType(
      erroredSandboxes.map((sandbox) => ({
        key: `errored-${sandbox.metadata.workspace}/${sandbox.metadata.name}`,
        type: 'errors' as const,
        status: 'danger' as const,
        text: sandbox.metadata.name,
        // Where the sandbox is, and the two things ERROR can mean: the
        // gateway could not provision it, or its main process exited
        // non-zero (hard fact 1). Only the log says which.
        detail: `In ${
          sandbox.metadata.workspace || 'an unnamed workspace'
        }. Provisioning failed, or the main process exited non-zero; the log says which.`,
        to: sandboxPath(
          sandbox.metadata.workspace ?? '',
          sandbox.metadata.name,
          'logs',
        ),
      })),
      (hidden) => ({
        key: 'errored-more',
        type: 'errors' as const,
        status: 'danger' as const,
        text: `${hidden} more ${hidden === 1 ? 'sandbox' : 'sandboxes'} in error`,
        detail: 'Every sandbox on the gateway is under All resources.',
        to: '/all-workspaces',
      }),
    ),
  );
  if (!isEmpty && providerCount === 0) {
    attention.push({
      key: 'no-providers',
      type: 'setup',
      status: 'warning',
      text: 'No providers',
      detail:
        'Sandboxes have no credentials to reach a model or a service until one is added.',
      to: '/all-workspaces',
    });
  }
  // The kinds that are actually waiting, in the order the card lists them.
  const attentionTypes = ATTENTION_TYPES.filter((type) =>
    attention.some((item) => item.type === type),
  );
  // A filter held across a refresh can outlive the last item of its kind.
  const activeType =
    attentionType !== 'all' && attentionTypes.includes(attentionType)
      ? attentionType
      : 'all';
  const shownAttention =
    activeType === 'all'
      ? attention
      : attention.filter((item) => item.type === activeType);

  return (
    <>
      <PageSection>
        <Title headingLevel="h1" className="pf-v6-u-mb-sm">
          Gateway report
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
            {/* Not full height. A list card stretched to the tallest card of
                the row ends in a band of empty card below its last rule,
                which reads as a footer with nothing in it. */}
            <Card data-testid="gateway-status-card">
              <CardTitle component="h2">Details</CardTitle>
              {/* The same list the inventory is, so the two cards of the row
                  read as one thing said twice over rather than as two. The
                  gateway's health is not among these: it is in the masthead,
                  on every page, and saying it again a fold below itself is
                  the same fact twice.

                  The margin is what keeps the last rule the length of the
                  others. A card clips its content to a 16px corner radius, so
                  a list flush with the bottom of one has the ends of its
                  final rule cut off. Held a card's own bottom padding clear
                  of the curve, the rule is drawn whole. */}
              <DataList
                aria-label="Details"
                isCompact
                gridBreakpoint="none"
                className="pf-v6-u-mb-lg"
              >
                {details.map((item) => (
                  <CardListRow key={item.testId} {...item} />
                ))}
              </DataList>
            </Card>
          </GridItem>
          {showInventory && (
            <GridItem lg={3} md={6}>
              <Card data-testid="gateway-counts">
                <CardTitle component="h2">Inventory</CardTitle>
                {/* Rows rather than tiles, after PatternFly's own dashboard
                    inventory card. The list is a direct child of the card and
                    not of a body, so each rule runs the card's full width
                    instead of stopping short of its padding. A column rather
                    than a band across the page: a figure right-aligned at the
                    far edge of a full-width card is a long way from the name
                    of what it counts. The margin keeps the last rule off the
                    card's rounded corner, which would otherwise clip it. */}
                <DataList
                  aria-label="Inventory"
                  isCompact
                  gridBreakpoint="none"
                  className="pf-v6-u-mb-lg"
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
              // A card of its own rather than an inline alert, so the three
              // columns of the row are three cards and the heading of each
              // is in the same place. An alert's amber bar shouted the whole
              // column at a page that is read before anything has gone
              // wrong; the colour belongs on the one line it is about.
              <Card data-testid="gateway-attention">
                {/* The filter sits across from the heading, where the
                    PatternFly dashboard card puts it: plain text with a
                    caret, not a bordered control competing with the
                    heading. It offers only the kinds that are waiting, so
                    choosing one can never empty the card. */}
                <CardHeader
                  // The heading box is as tall as what is in it, and a
                  // full-size control in it made this one taller than the
                  // bare titles of the two cards beside it. A small toggle,
                  // and the smaller padding a card title has under it,
                  // bring the three headings back to one height.
                  className="pf-v6-u-pb-md"
                  actions={{
                    hasNoOffset: true,
                    actions: (
                      <Dropdown
                        isOpen={isTypeOpen}
                        onOpenChange={setTypeOpen}
                        onSelect={(_event, value) => {
                          setAttentionType(value as AttentionType | 'all');
                          setTypeOpen(false);
                        }}
                        toggle={(toggleRef) => (
                          <MenuToggle
                            ref={toggleRef}
                            variant="plainText"
                            size="sm"
                            isExpanded={isTypeOpen}
                            onClick={() => setTypeOpen(!isTypeOpen)}
                            data-testid="gateway-attention-type"
                          >
                            {activeType === 'all'
                              ? 'All types'
                              : ATTENTION_TYPE_LABEL[activeType]}
                          </MenuToggle>
                        )}
                        popperProps={{ position: 'end' }}
                      >
                        <DropdownList>
                          <DropdownItem
                            key="all"
                            value="all"
                            isSelected={activeType === 'all'}
                          >
                            {`All types (${attention.length})`}
                          </DropdownItem>
                          {attentionTypes.map((type) => (
                            <DropdownItem
                              key={type}
                              value={type}
                              isSelected={activeType === type}
                            >
                              {`${ATTENTION_TYPE_LABEL[type]} (${
                                attention.filter((item) => item.type === type)
                                  .length
                              })`}
                            </DropdownItem>
                          ))}
                        </DropdownList>
                      </Dropdown>
                    ),
                  }}
                >
                  <CardTitle component="h2">Needs attention</CardTitle>
                </CardHeader>
                {/* The same list the two cards beside this one are built
                    from, so the three are ruled off the same way: under
                    the heading, between the rows and below the last of
                    them, each rule the full width of the card. A row here
                    is two lines rather than two columns — what the thing
                    is called, and a sentence saying what is wrong with
                    it. The margin keeps the closing rule off the card's
                    16px corner radius, which would clip its ends. */}
                <DataList
                  aria-label="Needs attention"
                  isCompact
                  gridBreakpoint="none"
                  className="pf-v6-u-mb-lg"
                >
                  {shownAttention.map((item) => (
                    <DataListItem
                      key={item.key}
                      aria-labelledby={`${item.key}-title`}
                    >
                      <DataListItemRow>
                        <DataListItemCells
                          dataListCells={[
                            <DataListCell key="item">
                              <Flex
                                direction={{ default: 'column' }}
                                gap={{ default: 'gapXs' }}
                              >
                                <FlexItem>
                                  <Flex
                                    gap={{ default: 'gapSm' }}
                                    flexWrap={{ default: 'nowrap' }}
                                    alignItems={{
                                      default: 'alignItemsCenter',
                                    }}
                                  >
                                    <FlexItem>
                                      <Icon status={item.status}>
                                        {ATTENTION_ICON[item.status]}
                                      </Icon>
                                    </FlexItem>
                                    <FlexItem>
                                      <Link
                                        to={item.to}
                                        id={`${item.key}-title`}
                                      >
                                        {item.text}
                                      </Link>
                                    </FlexItem>
                                  </Flex>
                                </FlexItem>
                                <FlexItem>{item.detail}</FlexItem>
                              </Flex>
                            </DataListCell>,
                          ]}
                        />
                      </DataListItemRow>
                    </DataListItem>
                  ))}
                </DataList>
              </Card>
            ) : (
              // The same card, built the same way, so that the column does
              // not change shape when the last thing waiting is dealt with.
              <Card data-testid="gateway-all-clear">
                <CardTitle component="h2">Needs attention</CardTitle>
                <DataList
                  aria-label="Needs attention"
                  isCompact
                  gridBreakpoint="none"
                  className="pf-v6-u-mb-lg"
                >
                  <DataListItem aria-labelledby="gateway-all-clear-label">
                    <DataListItemRow>
                      <DataListItemCells
                        dataListCells={[
                          <DataListCell key="all-clear">
                            <Flex
                              gap={{ default: 'gapSm' }}
                              flexWrap={{ default: 'nowrap' }}
                              alignItems={{ default: 'alignItemsCenter' }}
                            >
                              <FlexItem>
                                <Icon status="success">
                                  <CheckCircleIcon />
                                </Icon>
                              </FlexItem>
                              <FlexItem id="gateway-all-clear-label">
                                Nothing needs attention
                              </FlexItem>
                            </Flex>
                          </DataListCell>,
                        ]}
                      />
                    </DataListItemRow>
                  </DataListItem>
                </DataList>
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
          {/* What the gateway negotiated at start-up, each table under a
              heading of its own rather than behind a fold. There are a
              handful of rows in each on any real gateway, and a count in a
              toggle that has to be opened to see what it counts asks for a
              click to learn what the page could have said outright.

              Each is set off by the space the page puts between its
              heading and the first row of cards: a page section's bottom
              padding and the next one's top padding, both a medium spacer,
              which is the grid's own gutter over again. So one more of the
              same on top of the gutter, and a full-width card reads as the
              start of a band rather than as another card of the row. */}
          <GridItem span={12} className="pf-v6-u-mt-md">
            <Card data-testid="gateway-drivers-card">
              <CardTitle component="h2">
                {`Compute drivers (${(info?.computeDrivers ?? []).length})`}
              </CardTitle>
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
          </GridItem>
          <GridItem span={12} className="pf-v6-u-mt-md">
            <Card data-testid="gateway-extensions-card">
              <CardTitle component="h2">
                {`Extensions (${extensions.length})`}
              </CardTitle>
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
                      <Tr key={`${extension.kind}/${extension.configuredName}`}>
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
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
};

export default GatewayOverviewPage;
