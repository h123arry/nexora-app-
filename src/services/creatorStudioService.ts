import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export type CreatorStudioTemplate = {
  id: string;
  name: string;
  caption: string;
  format: 'text' | 'image' | 'video';
  tags: string[];
  updatedAt: string | null;
};

export type CreatorStudioTemplateInput = Omit<CreatorStudioTemplate, 'id' | 'updatedAt'> & { templateId?: string };

export async function listCreatorStudioTemplates(): Promise<CreatorStudioTemplate[]> {
  const callable = httpsCallable<void, { templates: CreatorStudioTemplate[] }>(functions, 'listCreatorStudioTemplates');
  return (await callable()).data.templates;
}

export async function saveCreatorStudioTemplate(input: CreatorStudioTemplateInput): Promise<{ templateId: string; saved: boolean }> {
  const callable = httpsCallable<CreatorStudioTemplateInput, { templateId: string; saved: boolean }>(functions, 'saveCreatorStudioTemplate');
  return (await callable)(input).data;
}

export async function deleteCreatorStudioTemplate(templateId: string): Promise<{ deleted: boolean }> {
  const callable = httpsCallable<{ templateId: string }, { deleted: boolean }>(functions, 'deleteCreatorStudioTemplate');
  return (await callable)({ templateId }).data;
}
