// Shared by suggested captions and the optional excerpt picker.
export async function deliverShare(text: string, copy = false): Promise<'shared' | 'copied' | 'cancelled'> {
  if (!copy && navigator.share) {
    try { await navigator.share({title: 'Hasta Rekha', text}); return 'shared'; }
    catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }
  if (!navigator.clipboard) throw new Error('Sharing isn’t supported in this browser. Download your report instead.');
  await navigator.clipboard.writeText(text);
  return 'copied';
}
