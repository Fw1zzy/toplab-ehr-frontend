'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { Settings2 } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="System configuration and preferences" />
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Settings2 className="mx-auto h-10 w-10 text-slate-300 mb-3" />
        <p className="text-sm font-medium text-slate-700">Settings</p>
        <p className="text-xs text-slate-400 mt-1">System configuration options will appear here.</p>
      </div>
    </div>
  );
}
