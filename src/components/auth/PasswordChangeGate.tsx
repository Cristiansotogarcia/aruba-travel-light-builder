import { ChangePasswordModal } from '@/components/admin/ChangePasswordModal';
import { useAuth } from '@/hooks/useAuth';

export const PasswordChangeGate = () => {
  const { user, profile, setProfile } = useAuth();

  if (!user || !profile?.needs_password_change) {
    return null;
  }

  return (
    <ChangePasswordModal
      open
      canCancel={false}
      onClose={() => undefined}
      onPasswordChanged={() => {
        setProfile((currentProfile) =>
          currentProfile
            ? {
                ...currentProfile,
                needs_password_change: false,
              }
            : currentProfile
        );
      }}
    />
  );
};
