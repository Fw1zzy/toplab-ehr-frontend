'use client';

import { Brain, AlertTriangle, Microscope, FileText, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { MOCK_LAB_RESULTS, MOCK_PATIENTS } from '@/lib/api/mock/data';
import { getPatientFullName, formatDate } from '@/lib/utils';

const AIDisclaimer = () => (
  <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-xs font-semibold text-amber-800">AI-GENERATED CONTENT</p>
      <p className="text-xs text-amber-700 mt-0.5">
        This content is intended to assist qualified healthcare professionals and does not replace clinical judgment. Always verify AI-generated information against patient data and established clinical guidelines.
      </p>
    </div>
  </div>
);

export default function AIClinicalToolsPage() {
  const labsWithAI = MOCK_LAB_RESULTS.filter((l) => l.ai_interpretation && l.status === 'released');

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Clinical Tools"
        description="AI-enhanced tools to assist clinical decision-making"
      />

      <AIDisclaimer />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Disease Risk Prediction */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
              <Brain className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Disease Risk Prediction</h2>
              <p className="text-xs text-slate-400">AI-powered risk stratification</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label htmlFor="risk-patient" className="block text-xs font-medium text-slate-700 mb-1.5">
                Select Patient
              </label>
              <select
                id="risk-patient"
                className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">Choose a patient...</option>
                {MOCK_PATIENTS.map((p) => (
                  <option key={p.id} value={p.id}>{getPatientFullName(p)}</option>
                ))}
              </select>
            </div>

            {/* Sample risk card */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Overall Risk Assessment</span>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  Moderate Risk
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Cardiovascular Disease', risk: 'Moderate', confidence: 72 },
                  { label: 'Diabetes Progression', risk: 'High', confidence: 84 },
                  { label: 'CKD Progression', risk: 'Low', confidence: 63 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600">{item.label}</span>
                        <span className={`text-xs font-medium ${
                          item.risk === 'High' ? 'text-red-600' : item.risk === 'Moderate' ? 'text-amber-600' : 'text-emerald-600'
                        }`}>{item.risk}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.risk === 'High' ? 'bg-red-400' : item.risk === 'Moderate' ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${item.confidence}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Model confidence: {item.confidence}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              id="run-risk-analysis-btn"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Run Risk Analysis
            </button>
          </div>
        </div>

        {/* Lab Result Interpretation */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Microscope className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Lab Result Interpretation</h2>
              <p className="text-xs text-slate-400">AI-generated clinical context for lab results</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {labsWithAI.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No released results with AI interpretations available.
              </div>
            ) : (
              labsWithAI.map((lab) => {
                const patient = MOCK_PATIENTS.find((p) => p.id === lab.patient_id);
                return (
                  <div key={lab.id} className="rounded-lg border border-slate-100 p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{lab.test_name}</p>
                        <p className="text-[10px] text-slate-400">{patient ? getPatientFullName(patient) : lab.patient_id as string} · {formatDate(lab.released_date ?? lab.requested_date)}</p>
                      </div>
                      <span className="flex-shrink-0 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Released</span>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">AI Interpretation</p>
                      <p className="text-xs text-slate-700 leading-relaxed">{lab.ai_interpretation}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Medical Summary Generation */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
              <FileText className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Medical Summary Generation</h2>
              <p className="text-xs text-slate-400">Generate a comprehensive clinical summary for a patient</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="summary-patient" className="block text-xs font-medium text-slate-700 mb-1.5">Patient</label>
                <select
                  id="summary-patient"
                  className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select patient...</option>
                  {MOCK_PATIENTS.map((p) => (
                    <option key={p.id} value={p.id}>{getPatientFullName(p)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="summary-type" className="block text-xs font-medium text-slate-700 mb-1.5">Summary Type</label>
                <select
                  id="summary-type"
                  className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option>Comprehensive Medical Summary</option>
                  <option>Discharge Summary</option>
                  <option>Referral Letter</option>
                  <option>Insurance Pre-authorization</option>
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <Brain className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500">Select a patient and click Generate to create an AI-assisted medical summary.</p>
              <p className="text-[10px] text-slate-400 mt-1">The summary will be based on the patient's encounters, laboratory results, and clinical notes.</p>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="h-8 px-3 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                Preview
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                id="generate-summary-btn"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate Summary
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
