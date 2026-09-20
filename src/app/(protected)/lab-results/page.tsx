'use client';

import { useState } from 'react';
import { TestTube } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { MOCK_PATIENTS, MOCK_LAB_RESULTS } from '@/lib/api/mock/data';
import { getPatientFullName } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { LabResult, Patient } from '@/types';

// Result categories matching the reference image
const RESULT_CATEGORIES = [
  { id: 'results_covid_antigen', label: 'Results Covid Antigen', collection: 'results_covid_antigen' },
  { id: 'results_clinical_chemistry', label: 'Results Clinical Chemistry', collection: 'results_clinical_chemistry' },
  { id: 'results_drug_test', label: 'Results Drug Test', collection: 'results_drug_test' },
  { id: 'results_ecg', label: 'Results ECG', collection: 'results_ecg' },
  { id: 'results_hematology', label: 'Results Hematology', collection: 'results_hematology' },
  { id: 'results_hematology_cbc', label: 'Results Hematology CBC', collection: 'results_hematology_cbc' },
  { id: 'results_hematology_pbs', label: 'Results Hematology PBS', collection: 'results_hematology_pbs' },
  { id: 'results_immunochemistry', label: 'Results Immunochemistry', collection: 'results_immunochemistry' },
  { id: 'results_urinalysis', label: 'Results Urinalysis', collection: 'results_urinalysis' },
  { id: 'results_microbiology_koh', label: 'Results Microbiology KOH', collection: 'results_microbiology_koh' },
  { id: 'results_pap_smear', label: 'Results Pap Smear', collection: 'results_pap_smear' },
  { id: 'results_parasitology', label: 'Results Parasitology', collection: 'results_parasitology' },
  { id: 'results_serology', label: 'Results Serology', collection: 'results_serology' },
  { id: 'results_serology_new', label: 'Results Serology New', collection: 'results_serology_new' },
  { id: 'results_sperm_analysis', label: 'Results Sperm Analysis', collection: 'results_sperm_analysis' },
  { id: 'results_os_xray', label: 'Results Os Xray', collection: 'results_os_xray' },
  { id: 'results_others', label: 'Results Others', collection: 'results_others' },
  { id: 'results_ultrasound', label: 'Results Ultrasound', collection: 'results_ultrasound' },
  { id: 'results_xray', label: 'Results Xray', collection: 'results_xray' },
];

function getPatientInfo(patientId: string | object): Patient | null {
  if (typeof patientId === 'object') return null;
  return MOCK_PATIENTS.find((pt) => pt.id === patientId) ?? null;
}

export default function LabResultsPage() {
  const [selectedCategory, setSelectedCategory] = useState(RESULT_CATEGORIES[0].id);
  const [categorySearch, setCategorySearch] = useState('');
  const [tableSearch, setTableSearch] = useState('');

  // Filter categories by search
  const filteredCategories = categorySearch
    ? RESULT_CATEGORIES.filter((c) =>
        c.label.toLowerCase().includes(categorySearch.toLowerCase()),
      )
    : RESULT_CATEGORIES;

  // Get the selected category info
  const selectedCategoryInfo = RESULT_CATEGORIES.find((c) => c.id === selectedCategory);

  // Filter lab results that have a result_collection matching the selected category
  // and status is 'completed' or 'released' (i.e., they have finalized results)
  const resultsForCategory = MOCK_LAB_RESULTS.filter((lab: LabResult) => {
    if (!lab.result_collection) return false;
    return lab.result_collection === selectedCategoryInfo?.collection &&
      (lab.status === 'completed' || lab.status === 'released');
  });

  // Apply table search
  const filteredResults = tableSearch
    ? resultsForCategory.filter((lab: LabResult) => {
        const patient = getPatientInfo(lab.patient_id);
        if (!patient) return false;
        return (
          patient.first_name.toLowerCase().includes(tableSearch.toLowerCase()) ||
          patient.last_name.toLowerCase().includes(tableSearch.toLowerCase())
        );
      })
    : resultsForCategory;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lab Results"
        description="View and manage finalized laboratory results by category"
      />

      <div className="flex gap-5 min-h-[calc(100vh-12rem)]">
        {/* Left Panel - Category List */}
        <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-3 py-3 border-b border-slate-100">
            <SearchInput
              value={categorySearch}
              onChange={setCategorySearch}
              placeholder="Search categories..."
              className="w-full"
              id="lab-results-category-search"
            />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <nav className="py-1">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  id={`category-${category.id}`}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-xs font-medium transition-colors',
                    selectedCategory === category.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                      : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <TestTube
                    className={cn(
                      'h-3.5 w-3.5 flex-shrink-0',
                      selectedCategory === category.id
                        ? 'text-blue-600'
                        : 'text-slate-400',
                    )}
                  />
                  <span className="truncate">{category.label}</span>
                </button>
              ))}
              {filteredCategories.length === 0 && (
                <p className="px-4 py-6 text-xs text-slate-400 text-center">
                  No categories found
                </p>
              )}
            </nav>
          </div>
        </div>

        {/* Right Panel - Results Table */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-blue-600">
                Content
              </span>
            </div>
            <h2 className="text-sm font-semibold text-slate-900">
              {selectedCategoryInfo?.label ?? 'Select a Category'}
            </h2>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <SearchInput
              value={tableSearch}
              onChange={setTableSearch}
              placeholder="Search by patient name..."
              className="w-64"
              id="lab-results-table-search"
            />
          </div>

          {/* Table */}
          {filteredResults.length === 0 ? (
            <EmptyState
              icon={TestTube}
              title="No results found"
              description={`No finalized results in this category${tableSearch ? ' matching your search' : ''}.`}
            />
          ) : (
            <div className="flex-1 overflow-x-auto">
              <table
                className="w-full text-sm"
                aria-label="Lab results table"
              >
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">
                      First Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                      Last Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredResults.map((lab: LabResult) => {
                    const patient = getPatientInfo(lab.patient_id);
                    return (
                      <tr
                        key={lab.id}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-xs font-medium text-slate-900">
                          {patient?.first_name ?? '—'}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-medium text-blue-600">
                          {patient?.last_name ?? '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status="with_results" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
