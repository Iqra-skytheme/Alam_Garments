export const cleanPhone = s => String(s||'').replace(/\s+/g,' ').trim();
export const today = () => new Date().toISOString().split('T')[0];
