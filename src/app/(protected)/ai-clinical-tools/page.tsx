'use client';

import { Brain } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ClinicalToolsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="AI Clinical Tools" description="Clinical insights from EHR data" />
      <EmptyState
        icon={Brain}
        title="No AI clinical data available"
        description="The connected EHR schema does not expose AI interpretations. No generated or sample clinical content is shown."
      />
    </div>
  );
}
