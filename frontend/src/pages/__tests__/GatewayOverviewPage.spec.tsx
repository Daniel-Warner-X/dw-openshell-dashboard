import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GatewayOverviewPage from '../GatewayOverviewPage';
import { APP_VERSION } from '../../constants';
import type { GatewayInfo, Sandbox } from '../../types';

jest.mock('../../api/gateway', () => ({
  useGatewayInfo: jest.fn(),
  useGatewayCompatibility: jest.fn(),
}));
jest.mock('../../api/allWorkspaces', () => ({
  useAllSandboxes: jest.fn(),
  useAllProviders: jest.fn(),
  useAllTemplates: jest.fn(),
  useAllServices: jest.fn(),
}));
jest.mock('../../api/workspaces', () => ({ useWorkspaces: jest.fn() }));
jest.mock('../../api/policy', () => ({ useGlobalPolicy: jest.fn() }));
jest.mock('../../api/settings', () => ({ useGlobalSettings: jest.fn() }));
jest.mock('../../api/draftSummary', () => ({
  useAllWorkspacesDraftSummary: jest.fn(),
}));
jest.mock('../../api/auth', () => ({
  useFeatureFlags: () => ({
    services: true,
    globalPolicy: true,
    settings: true,
    draftPolicy: true,
  }),
}));

import {
  useAllProviders,
  useAllSandboxes,
  useAllServices,
  useAllTemplates,
} from '../../api/allWorkspaces';
import { useAllWorkspacesDraftSummary } from '../../api/draftSummary';
import { useGatewayCompatibility, useGatewayInfo } from '../../api/gateway';
import { useGlobalPolicy } from '../../api/policy';
import { useGlobalSettings } from '../../api/settings';
import { useWorkspaces } from '../../api/workspaces';

const mockUseGatewayInfo = useGatewayInfo as jest.Mock;
const mockUseGatewayCompatibility = useGatewayCompatibility as jest.Mock;
const mockUseAllSandboxes = useAllSandboxes as jest.Mock;
const mockUseAllProviders = useAllProviders as jest.Mock;
const mockUseAllTemplates = useAllTemplates as jest.Mock;
const mockUseAllServices = useAllServices as jest.Mock;
const mockUseWorkspaces = useWorkspaces as jest.Mock;
const mockUseGlobalPolicy = useGlobalPolicy as jest.Mock;
const mockUseGlobalSettings = useGlobalSettings as jest.Mock;
const mockUseDraftSummary = useAllWorkspacesDraftSummary as jest.Mock;

const answered = (data: unknown) => ({
  isLoading: false,
  isError: false,
  data,
});
const refused = () => ({
  isLoading: false,
  isError: true,
  error: new Error("role 'openshell-admin' required"),
  data: undefined,
});

const sandbox = (name: string, phase: Sandbox['status']['phase']): Sandbox => ({
  metadata: {
    id: name,
    name,
    workspace: 'team-a',
    createdAtMs: 0,
    resourceVersion: 1,
  },
  spec: { image: 'example.com/base:latest' },
  status: { phase, currentPolicyVersion: 1 },
});

// Everything the page reads besides the gateway's own info, answered. Each
// test overrides what it is about.
const answerEverythingElse = () => {
  mockUseGatewayCompatibility.mockReturnValue(answered(undefined));
  mockUseWorkspaces.mockReturnValue(answered([{}, {}]));
  mockUseAllSandboxes.mockReturnValue(answered([sandbox('agent', 'READY')]));
  mockUseAllProviders.mockReturnValue(answered([{}]));
  mockUseAllTemplates.mockReturnValue(answered([]));
  mockUseAllServices.mockReturnValue(answered([]));
  mockUseGlobalPolicy.mockReturnValue(answered({ activeVersion: 0 }));
  mockUseGlobalSettings.mockReturnValue(answered({ settings: [] }));
  mockUseDraftSummary.mockReturnValue({
    ...answered(undefined),
    items: [],
    totalPending: 0,
  });
};

const renderPage = () =>
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <GatewayOverviewPage />
    </MemoryRouter>,
  );

describe('GatewayOverviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    answerEverythingElse();
  });

  it('shows spinner during loading', () => {
    mockUseGatewayInfo.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    });
    renderPage();
    expect(screen.getByLabelText('Loading gateway info')).toBeInTheDocument();
  });

  it('shows error alert on fetch failure', () => {
    mockUseGatewayInfo.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error('Connection refused'),
      refetch: jest.fn(),
    });
    renderPage();
    expect(
      screen.getByText('Cannot reach the OpenShell gateway'),
    ).toBeInTheDocument();
    expect(screen.getByText('Connection refused')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  // One strip, not a card each: both versions and the verdict that relates
  // them. The gateway's health is the masthead's, on every page.
  it('states both versions and the verdict together, and not the health', () => {
    const info: GatewayInfo = {
      status: 'HEALTHY',
      gatewayVersion: '0.1.2',
      computeDrivers: [
        { name: 'local-podman', driverName: 'podman', driverVersion: '5.2.0' },
      ],
    };
    mockUseGatewayInfo.mockReturnValue(answered(info));
    mockUseGatewayCompatibility.mockReturnValue(
      answered({
        gatewayVersion: '0.1.2',
        compatibility: {
          status: 'supported',
          supportedMin: '0.1.0',
          supportedMax: '0.1.2',
        },
      }),
    );
    renderPage();

    const strip = within(screen.getByTestId('gateway-status-card'));
    expect(strip.queryByText('HEALTHY')).not.toBeInTheDocument();
    expect(strip.getByTestId('gateway-version')).toHaveTextContent('0.1.2');
    expect(strip.getByTestId('dashboard-version')).toHaveTextContent(
      APP_VERSION,
    );
    expect(strip.getByTestId('gateway-compatibility')).toHaveTextContent(
      'Supported (0.1.0 to 0.1.2)',
    );
  });

  it('says so when there is no verdict to report', () => {
    mockUseGatewayInfo.mockReturnValue(
      answered({ status: 'HEALTHY', gatewayVersion: '0.1.2' }),
    );
    renderPage();

    expect(screen.getByTestId('gateway-compatibility')).toHaveTextContent(
      'Not known',
    );
  });

  // Each count leads to the page it was read from.
  it('counts what is on the gateway', () => {
    mockUseGatewayInfo.mockReturnValue(
      answered({ status: 'HEALTHY', gatewayVersion: '0.1.2' }),
    );
    mockUseAllTemplates.mockReturnValue(answered([{}, {}, {}]));
    mockUseGlobalPolicy.mockReturnValue(answered({ activeVersion: 4 }));
    mockUseGlobalSettings.mockReturnValue(
      answered({
        settings: [
          { key: 'ocsf_json_enabled', value: true },
          { key: 'ocsf_schema_version' },
        ],
      }),
    );
    renderPage();

    const tile = (testId: string) =>
      within(screen.getByTestId(testId)).getByRole('link');
    expect(tile('gateway-count-workspaces')).toHaveTextContent('2');
    expect(tile('gateway-count-workspaces')).toHaveAttribute(
      'href',
      '/workspaces',
    );
    expect(tile('gateway-count-sandboxes')).toHaveTextContent('1');
    expect(tile('gateway-count-providers')).toHaveTextContent('1');
    expect(tile('gateway-count-templates')).toHaveTextContent('3');
    expect(tile('gateway-count-services')).toHaveTextContent('0');
    // A history of revisions is not a policy: only an active version is one.
    expect(tile('gateway-count-global-policy')).toHaveTextContent('In force');
    // Every registered key comes back, one that was never set with no value.
    expect(tile('gateway-count-settings')).toHaveTextContent('1');
  });

  // The four lists across workspaces are answered for platform admins only.
  // A refusal is not a zero, so the tile is left out rather than made up.
  it('leaves out the count the gateway refused', () => {
    mockUseGatewayInfo.mockReturnValue(
      answered({ status: 'HEALTHY', gatewayVersion: '0.1.2' }),
    );
    mockUseAllTemplates.mockReturnValue(refused());
    renderPage();

    expect(screen.getByTestId('gateway-count-sandboxes')).toBeInTheDocument();
    expect(
      screen.queryByTestId('gateway-count-templates'),
    ).not.toBeInTheDocument();
  });

  // A gateway starts with a `default` workspace, so having workspaces is not
  // having been used.
  it('walks through the flow instead of counting an empty gateway', () => {
    mockUseGatewayInfo.mockReturnValue(
      answered({ status: 'HEALTHY', gatewayVersion: '0.1.2' }),
    );
    mockUseAllSandboxes.mockReturnValue(answered([]));
    mockUseAllProviders.mockReturnValue(answered([]));
    renderPage();

    const started = within(screen.getByTestId('gateway-get-started'));
    expect(started.getByText('Create a workspace')).toBeInTheDocument();
    expect(started.getByText('Add a provider')).toBeInTheDocument();
    expect(started.getByText('Create a sandbox')).toBeInTheDocument();
    expect(screen.queryByTestId('gateway-counts')).not.toBeInTheDocument();
  });

  it('raises what is worth doing something about, and nothing when all is well', () => {
    mockUseGatewayInfo.mockReturnValue(
      answered({ status: 'HEALTHY', gatewayVersion: '0.1.2' }),
    );
    renderPage();
    expect(screen.queryByTestId('gateway-attention')).not.toBeInTheDocument();
    // The column beside the health card says so rather than going blank.
    expect(screen.getByTestId('gateway-all-clear')).toHaveTextContent(
      'Nothing needs attention',
    );

    mockUseAllSandboxes.mockReturnValue(
      answered([sandbox('agent', 'READY'), sandbox('builder', 'ERROR')]),
    );
    mockUseAllProviders.mockReturnValue(answered([]));
    renderPage();

    const attention = within(screen.getAllByTestId('gateway-attention')[0]);
    // The sandbox in error is named and leads to its own log, which is the
    // only thing that says why it is in error. A count would have led to a
    // list the reader then has to search.
    expect(attention.getByText('builder')).toHaveAttribute(
      'href',
      '/workspaces/team-a/sandboxes/builder?tab=logs',
    );
    expect(attention.getByText(/Provisioning failed/)).toBeInTheDocument();
    expect(
      attention.getByText(/^No providers/, { selector: 'a' }),
    ).toBeInTheDocument();
    // The second render is the one with something waiting; the all-clear
    // panel belongs to the first, which is still mounted beside it.
    expect(screen.getAllByTestId('gateway-all-clear')).toHaveLength(1);
  });

  // A rule an agent proposed is a sandbox held up until somebody decides on
  // it, so it leads the list, and each one leads to the inbox where that
  // decision is made — approving binds a chunk to the review token of the
  // reviewer's own last read of it (hard fact 25).
  it('names every sandbox with rules waiting, ahead of the errors', () => {
    mockUseGatewayInfo.mockReturnValue(
      answered({ status: 'HEALTHY', gatewayVersion: '0.1.2' }),
    );
    mockUseDraftSummary.mockReturnValue({
      ...answered(undefined),
      items: [
        {
          workspace: 'team-a',
          sandboxName: 'quiet',
          pendingCount: 1,
          hasSecurityFlags: false,
          latestDraftMs: 10,
        },
        {
          workspace: 'team-b',
          sandboxName: 'flagged',
          pendingCount: 2,
          hasSecurityFlags: true,
          latestDraftMs: 5,
        },
      ],
      totalPending: 3,
    });
    mockUseAllSandboxes.mockReturnValue(
      answered([sandbox('agent', 'READY'), sandbox('builder', 'ERROR')]),
    );
    renderPage();

    const card = within(screen.getByTestId('gateway-attention'));
    const rows = card.getAllByRole('link');
    // The one the prover flagged leads, whatever its age.
    expect(rows[0]).toHaveTextContent('flagged');
    expect(rows[0]).toHaveAttribute(
      'href',
      '/workspaces/team-b/sandboxes/flagged?tab=proposals',
    );
    expect(rows[1]).toHaveTextContent('quiet');
    expect(rows[2]).toHaveTextContent('builder');
    expect(
      card.getByText(
        '2 policy rules waiting for a decision in team-b, flagged by the prover.',
      ),
    ).toBeInTheDocument();
    expect(
      card.getByText('1 policy rule waiting for a decision in team-a.'),
    ).toBeInTheDocument();
  });

  // A summary that carries a total but no sandboxes still says so, and all
  // it can do is lead to the page that lists them.
  it('falls back to the total when no sandbox is named', () => {
    mockUseGatewayInfo.mockReturnValue(
      answered({ status: 'HEALTHY', gatewayVersion: '0.1.2' }),
    );
    mockUseDraftSummary.mockReturnValue({
      ...answered(undefined),
      items: [],
      totalPending: 3,
    });
    renderPage();

    const rows = within(screen.getByTestId('gateway-attention')).getAllByRole(
      'link',
    );
    expect(rows[0]).toHaveTextContent('3 policy rules waiting for a decision');
    expect(rows[0]).toHaveAttribute('href', '/proposals');
  });

  // Only the kinds that are waiting are offered, and choosing one leaves the
  // other kinds' lines out.
  it('filters the card by the kind of thing waiting', () => {
    mockUseGatewayInfo.mockReturnValue(
      answered({ status: 'HEALTHY', gatewayVersion: '0.1.2' }),
    );
    mockUseAllSandboxes.mockReturnValue(
      answered([sandbox('agent', 'READY'), sandbox('builder', 'ERROR')]),
    );
    mockUseAllProviders.mockReturnValue(answered([]));
    renderPage();

    const card = within(screen.getByTestId('gateway-attention'));
    expect(card.getByTestId('gateway-attention-type')).toHaveTextContent(
      'All types',
    );
    // The menu itself is a popper, outside the card.
    fireEvent.click(card.getByTestId('gateway-attention-type'));
    const menu = within(screen.getByRole('menu'));
    // Nothing is proposed, so Proposals is not offered.
    expect(menu.queryByText(/^Proposals/)).not.toBeInTheDocument();
    expect(menu.getByText('All types (2)')).toBeInTheDocument();
    fireEvent.click(menu.getByText('Sandbox errors (1)'));

    expect(card.getByText('builder')).toBeInTheDocument();
    expect(card.queryByText(/^No providers/)).not.toBeInTheDocument();
  });

  it('displays compute drivers table', () => {
    const info: GatewayInfo = {
      status: 'HEALTHY',
      gatewayVersion: '0.0.92',
      computeDrivers: [
        { name: 'local-podman', driverName: 'podman', driverVersion: '5.2.0' },
        {
          name: 'k8s-cluster',
          driverName: 'kubernetes',
          driverVersion: '1.30',
        },
      ],
    };
    mockUseGatewayInfo.mockReturnValue(answered(info));
    renderPage();
    expect(screen.getByText('Compute drivers (2)')).toBeInTheDocument();
    expect(screen.getByTestId('gateway-drivers-card')).toBeInTheDocument();
    expect(screen.getByText('local-podman')).toBeInTheDocument();
    expect(screen.getByText('k8s-cluster')).toBeInTheDocument();
  });

  // What `openshell gateway info` lists under "Extensions": the configured
  // name and kind, the implementation with its version and protocol, what it
  // can do and what it needs from the gateway.
  it('displays the extensions the gateway negotiated', () => {
    const info: GatewayInfo = {
      status: 'HEALTHY',
      gatewayVersion: '0.1.2',
      computeDrivers: [{ name: 'podman', driverName: 'podman' }],
      extensions: [
        {
          kind: 'COMPUTE_DRIVER',
          configuredName: 'podman',
          implementationName: 'example-driver',
          implementationVersion: '0.1.2',
          protocolMajor: 1,
          protocolMinor: 3,
          supportedCapabilities: ['capability-a', 'capability-b'],
          requiredCapabilities: ['gateway-capability'],
        },
        {
          kind: 'CREDENTIAL_DRIVER',
          configuredName: 'vault',
          protocolMajor: 2,
          protocolMinor: 0,
        },
      ],
    };
    mockUseGatewayInfo.mockReturnValue(answered(info));
    renderPage();

    expect(screen.getByText('Extensions (2)')).toBeInTheDocument();

    const card = within(screen.getByTestId('gateway-extensions-card'));
    expect(
      card.getAllByRole('columnheader').map((header) => header.textContent),
    ).toEqual([
      'Name',
      'Kind',
      'Implementation',
      'Protocol',
      'Capabilities',
      'Requires from gateway',
    ]);
    const rows = card
      .getAllByRole('row')
      .slice(1)
      .map((row) =>
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent),
      );
    expect(rows).toEqual([
      [
        'podman',
        'Compute driver',
        'example-driver 0.1.2',
        '1.3',
        'capability-acapability-b',
        'gateway-capability',
      ],
      ['vault', 'Credential driver', '-', '2.0', '-', '-'],
    ]);
  });

  it('names every extension kind, and shows one it does not know as sent', () => {
    const kinds = [
      ['COMPUTE_DRIVER', 'Compute driver'],
      ['CREDENTIAL_DRIVER', 'Credential driver'],
      ['GATEWAY_INTERCEPTOR', 'Gateway interceptor'],
      ['SUPERVISOR_MIDDLEWARE', 'Supervisor middleware'],
      ['UNSPECIFIED', 'Unspecified'],
      ['SOMETHING_NEW', 'SOMETHING_NEW'],
    ];
    mockUseGatewayInfo.mockReturnValue(
      answered({
        status: 'HEALTHY',
        gatewayVersion: '0.1.2',
        computeDrivers: [],
        extensions: kinds.map(([kind], index) => ({
          kind,
          configuredName: `extension-${index}`,
          protocolMajor: 1,
          protocolMinor: 0,
        })),
      }),
    );
    renderPage();

    for (const [index, [, label]] of kinds.entries()) {
      const row = screen.getByText(`extension-${index}`).closest('tr');
      expect(row).toHaveTextContent(label);
    }
  });

  // A gateway without extensions, and a BFF that predates the field, both
  // leave the card saying so instead of breaking the page.
  it.each([
    ['an empty list', []],
    ['no extensions field', undefined],
  ])('shows that none were reported for %s', (_name, extensions) => {
    mockUseGatewayInfo.mockReturnValue(
      answered({
        status: 'HEALTHY',
        gatewayVersion: '0.1.0',
        computeDrivers: [],
        extensions,
      }),
    );
    renderPage();

    expect(screen.getByText('Extensions (0)')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('gateway-extensions-card')).getByText(
        'No extensions reported',
      ),
    ).toBeInTheDocument();
  });

  it('shows empty driver message when none reported', () => {
    const info: GatewayInfo = {
      status: 'HEALTHY',
      gatewayVersion: '0.0.92',
      computeDrivers: [],
    };
    mockUseGatewayInfo.mockReturnValue(answered(info));
    renderPage();
    expect(screen.getByText('No compute drivers reported')).toBeInTheDocument();
  });
});
