import { NextResponse } from 'next/server';
import dataModelFile from '../../../../../datamodel.json';

const schema = dataModelFile.data;

const resultCollections = (schema.collections as Array<{ collection: string }>)
  .map((item) => item.collection)
  .filter((collection) => collection.startsWith('results_') && collection !== 'results_parasitology_encounter');

export async function GET() {
  const collections = resultCollections.map((collection) => {
    const fields = (schema.fields as Array<{
      collection: string;
      field: string;
      type: string;
      meta?: {
        special?: string[] | string | null;
        interface?: string | null;
        required?: boolean;
        readonly?: boolean;
        options?: { choices?: Array<{ text: string; value: string | number }> };
      };
    }>)
      .filter((field) => {
        const special = Array.isArray(field.meta?.special) ? field.meta.special : [];
        return field.collection === collection && field.field !== 'id'
          && !field.meta?.readonly && !special.includes('alias') && !special.includes('no-data');
      })
      .map((field) => ({
        name: field.field,
        label: field.field.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        type: field.type,
        interface: field.meta?.interface ?? null,
        required: Boolean(field.meta?.required),
        choices: field.meta?.options?.choices ?? [],
      }));

    return {
      collection,
      label: collection.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      fields,
    };
  });

  return NextResponse.json(collections, {
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
  });
}
