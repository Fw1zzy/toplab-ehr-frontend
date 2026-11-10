'use client';

import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';

interface PatientAvatarProps {
  patientId: string;
  avatarFileId?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function PatientAvatar({ patientId, avatarFileId, name, size = 'md', className }: PatientAvatarProps) {
  const [loadedAvatar, setLoadedAvatar] = useState<{ fileId: string; url: string } | null>(null);

  useEffect(() => {
    const fileId = avatarFileId ?? '';
    if (!fileId) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    async function loadAvatar() {
      const token = await api.auth.getAccessToken();
      if (!token) return;
      const response = await fetch(`/api/patients/avatar/${encodeURIComponent(fileId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!response.ok) return;
      objectUrl = URL.createObjectURL(await response.blob());
      if (cancelled) URL.revokeObjectURL(objectUrl);
      else setLoadedAvatar({ fileId, url: objectUrl });
    }
    void loadAvatar().catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFileId, patientId]);

  const avatarUrl = avatarFileId && loadedAvatar?.fileId === avatarFileId ? loadedAvatar.url : null;
  return <Avatar name={name} src={avatarUrl} size={size} className={className} />;
}
