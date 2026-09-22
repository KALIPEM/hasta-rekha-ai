import type { ReadingContent } from '../types';
export function parseReadingContent(value: unknown): ReadingContent {
  const data = typeof value === 'string' ? JSON.parse(value.replace(/^```(?:json)?\s*|\s*```$/g, '')) : value;
  const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
  const list = (v: unknown, check: (item: any) => boolean) => Array.isArray(v) && v.every(check);
  const score = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
  if (!data || !text(data.openingHook) || !text(data.majorHighlight) || !text(data.executiveSummary)
    || !data.imageQualityCheck || !['clarity', 'confidenceImpact', 'notes'].every(k => text(data.imageQualityCheck[k]))
    || !list(data.aspects, a => a && ['aspectName', 'summary', 'detailedInterpretation', 'palmEvidence'].every(k => text(a[k]))) || !data.aspects.length
    || !list(data.lifeTimeline, a => a && ['ageRange', 'phaseName', 'keyEventOrShift', 'palmEvidence'].every(k => text(a[k])))
    || !list(data.behavioralPatterns, a => a && text(a.pattern) && text(a.evidence) && score(a.confidence))
    || !list(data.recommendedActions, text) || !score(data.overallConfidence)
    || (data.lifeAreas !== undefined && (!list(data.lifeAreas,a=>a && ['id','title','summary','watchOutFor','nextStep','basis'].every(k=>text(a[k])) && list(a.insights,text) && a.insights.length===2) || new Set(data.lifeAreas.map((a:any)=>a.id)).size!==data.lifeAreas.length))) {
    throw new Error('The reading was incomplete. Please try again with a clear photo of your whole palm.');
  }
  return data;
}
