import { NextRequest, NextResponse } from 'next/server';
import {
  assertSameOrigin,
  bearerToken,
  cmsRequest,
  getRequestContext,
  hasActiveInterclinicShare,
  InterclinicError,
} from '@/lib/interclinicServer';

export const runtime = 'nodejs';

interface Relation {
  id: string;
  code?: string | null;
  name?: string | null;
}

interface ConsentRecord {
  id: string;
  status: string;
  effect: string;
  purpose: string;
  scope: string[] | null;
  source_branch: Relation | string;
  destination_branch: Relation | string;
  approved_at: string | null;
  access_expires_at: string | null;
}

interface AuditRecord {
  id: string;
  event_type: string;
  branch: Relation | string;
  consent: Relation | string | null;
  date_created: string | null;
  details: Record<string, unknown> | null;
}

function relationId(relation: Relation | string | null | undefined) {
  return typeof relation === 'string' ? relation : relation?.id ?? null;
}

function relationLabel(relation: Relation | string) {
  if (typeof relation === 'string') return relation;
  return relation.name || relation.code || relation.id;
}

type RouteContext = { params: Promise<{ patientId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const token = bearerToken(request);
    const context = await getRequestContext(token);
    const { patientId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(patientId)) throw new InterclinicError('Select a valid EHR patient record.', 400);

    const patient = await cmsRequest<{
      id: string;
      global_patient_id: string | null;
      custodian_branch: Relation | string | null;
    }>(token, `/items/patient/${encodeURIComponent(patientId)}?fields=id,global_patient_id,custodian_branch`);
    if (!patient.global_patient_id) throw new InterclinicError('This patient has no global patient ID.', 404);

    const isCustodian = relationId(patient.custodian_branch) === context.branch.id;
    const hasActiveShare = !isCustodian
      ? await hasActiveInterclinicShare(token, patient.global_patient_id, context.branch.id, 'patient')
      : false;
    if (!isCustodian && !hasActiveShare) {
      throw new InterclinicError('There is no active patient-sharing authorization for your branch.', 403);
    }
    const query = new URLSearchParams({
      limit: '100',
      fields: 'id,status,effect,purpose,scope,source_branch.id,source_branch.code,source_branch.name,destination_branch.id,destination_branch.code,destination_branch.name,approved_at,access_expires_at',
    });
    query.set('filter[global_patient_id][_eq]', patient.global_patient_id);

    const allTransactions = await cmsRequest<ConsentRecord[]>(token, `/items/interclinic_consent?${query}`);
    const transactions = isCustodian ? allTransactions : allTransactions.filter((entry) =>
      relationId(entry.destination_branch) === context.branch.id && entry.effect === 'view_only',
    );
    if (!isCustodian && transactions.length === 0) {
      throw new InterclinicError('You are not authorized to view this patient’s interclinic history.', 403);
    }

    const auditQuery = new URLSearchParams({
      limit: '200',
      sort: '-date_created',
      fields: 'id,event_type,branch.id,branch.code,branch.name,consent.id,date_created,details',
    });
    auditQuery.set('filter[global_patient_id][_eq]', patient.global_patient_id);
    const allEvents = await cmsRequest<AuditRecord[]>(token, `/items/interclinic_access_audit?${auditQuery}`);
    const transactionIds = new Set(transactions.map((entry) => entry.id));
    const events = isCustodian ? allEvents : allEvents.filter((entry) =>
      relationId(entry.consent) && transactionIds.has(relationId(entry.consent)!),
    );

    return NextResponse.json({
      data: {
        transactions: transactions.map((entry) => ({
          id: entry.id,
          status: entry.status === 'approved' && entry.access_expires_at && new Date(entry.access_expires_at).getTime() <= Date.now()
            ? 'expired' : entry.status,
          effect: entry.effect,
          purpose: entry.purpose,
          scope: entry.scope ?? [],
          sourceBranch: relationLabel(entry.source_branch),
          destinationBranch: relationLabel(entry.destination_branch),
          requestedAt: events.find((event) => relationId(event.consent) === entry.id && event.event_type === 'request')?.date_created ?? null,
          approvedAt: entry.approved_at,
          accessExpiresAt: entry.access_expires_at,
        })),
        events: events.map((entry) => ({
          id: entry.id,
          consentId: relationId(entry.consent),
          eventType: entry.event_type,
          branch: relationLabel(entry.branch),
          occurredAt: entry.date_created,
          details: entry.details ?? {},
        })),
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to load interclinic patient history.', 500);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
