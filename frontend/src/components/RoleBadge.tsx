import { Label } from '@patternfly/react-core';
import { useI18n } from '../i18n';

type RoleBadgeProps = {
  isPlatformAdmin: boolean;
  isUser: boolean;
  isLoading: boolean;
};

const RoleBadge: React.FC<RoleBadgeProps> = ({
  isPlatformAdmin,
  isUser,
  isLoading,
}) => {
  const { t } = useI18n('common');

  if (isLoading || (!isPlatformAdmin && !isUser)) {
    return null;
  }

  return (
    // A full-height toolbar stretches its items, which made this badge as
    // tall as the masthead beside a gateway status badge of its own height.
    // Label has no prop for align-self, so the utility class is the way to
    // it. Not compact either, so the two badges are the same size.
    <Label className="pf-v6-u-align-self-center" data-testid="role-badge">
      {isPlatformAdmin ? t('header.roleAdmin') : t('header.roleUser')}
    </Label>
  );
};

export default RoleBadge;
