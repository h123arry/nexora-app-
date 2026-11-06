import React, { useEffect, useRef, useState } from 'react';
import { Megaphone, Send, Trash2 } from 'lucide-react';
import { deletePageChannelUpdate, publishPageChannelUpdate, watchPageChannelUpdates, type PageChannelUpdate } from '../services/firebase/pageChannelUpdatesService';

interface Props { pageId: string; ownerId: string; currentUserId: string; isFollowing: boolean; locale?: 'en' | 'fr' | 'ar' | 'pt'; }
const copy = {
 en: { title:'Official channel', subtitle:'Direct updates from this Page to its followers', follow:'Follow this Page to read its official channel updates.', publish:'Publish an update', placeholder:'Share an update with your Page followers...', published:'Your update was published to Page followers.', publishError:'The update could not be published.', removed:'Channel update removed.', removeError:'The update could not be removed.', empty:'No official channel updates yet.', recent:'Recently published' },
 fr: { title:'Canal officiel', subtitle:'Actualités directes de cette Page pour ses abonnés', follow:'Suivez cette Page pour lire les actualités de son canal officiel.', publish:'Publier une actualité', placeholder:'Partagez une actualité avec les abonnés de votre Page...', published:'Votre actualité a été publiée pour les abonnés de la Page.', publishError:'Impossible de publier cette actualité.', removed:'Actualité du canal supprimée.', removeError:'Impossible de supprimer cette actualité.', empty:'Aucune actualité officielle pour le moment.', recent:'Publié récemment' },
 ar: { title:'القناة الرسمية', subtitle:'تحديثات مباشرة من هذه الصفحة إلى متابعيها', follow:'تابع هذه الصفحة لقراءة تحديثات قناتها الرسمية.', publish:'نشر تحديث', placeholder:'شارك تحديثاً مع متابعي صفحتك...', published:'تم نشر تحديثك لمتابعي الصفحة.', publishError:'تعذر نشر التحديث.', removed:'تم حذف تحديث القناة.', removeError:'تعذر حذف التحديث.', empty:'لا توجد تحديثات رسمية بعد.', recent:'نُشر مؤخراً' },
 pt: { title:'Canal oficial', subtitle:'Atualizações diretas desta Página para os seus seguidores', follow:'Siga esta Página para ler as atualizações do canal oficial.', publish:'Publicar atualização', placeholder:'Partilhe uma atualização com os seguidores da sua Página...', published:'A sua atualização foi publicada para os seguidores da Página.', publishError:'Não foi possível publicar a atualização.', removed:'Atualização do canal removida.', removeError:'Não foi possível remover a atualização.', empty:'Ainda não há atualizações oficiais.', recent:'Publicado recentemente' }
};

export default function PageChannelPanel({ pageId, ownerId, currentUserId, isFollowing, locale = 'en' }: Props) {
 const t = copy[locale] || copy.en;
 const isOwner = currentUserId === ownerId;
 const canRead = isOwner || isFollowing;
 const [updates, setUpdates] = useState<PageChannelUpdate[]>([]);
 const [content, setContent] = useState('');
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [notice, setNotice] = useState('');
 const publishAttemptRef = useRef<{ content: string; key: string } | null>(null);
 useEffect(() => { setUpdates([]); if (!canRead) return; return watchPageChannelUpdates(pageId, setUpdates, () => setError('Channel updates could not be loaded.')); }, [pageId, canRead]);
 const publish = async (event: React.FormEvent) => {
  event.preventDefault(); if (busy || !content.trim()) return;
  setBusy(true); setError(''); setNotice('');
  try { const normalizedContent = content.trim(); const attempt = publishAttemptRef.current?.content === normalizedContent ? publishAttemptRef.current : { content: normalizedContent, key: crypto.randomUUID() }; publishAttemptRef.current = attempt; await publishPageChannelUpdate(pageId, normalizedContent, attempt.key); publishAttemptRef.current = null; setContent(''); setNotice(t.published); }
  catch (cause) { setError(cause instanceof Error ? cause.message : t.publishError); } finally { setBusy(false); }
 };
 const remove = async (updateId: string) => { setBusy(true); setError(''); try { await deletePageChannelUpdate(pageId, updateId); setNotice(t.removed); } catch { setError(t.removeError); } finally { setBusy(false); } };
 return <section className="mt-6 rounded-2xl border border-violet-400/20 bg-[#0b1020] p-4 sm:p-5 space-y-4" aria-label={t.title}>
  <div className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-violet-300" /><div><h3 className="text-sm font-bold text-white">{t.title}</h3><p className="text-xs text-slate-400">{t.subtitle}</p></div></div>
  {!canRead && <p className="rounded-xl border border-white/10 p-3 text-xs text-slate-300">{t.follow}</p>}
  {isOwner && <form onSubmit={publish} className="space-y-2"><label htmlFor="page-channel-update" className="block text-xs font-semibold text-slate-300">{t.publish}</label><textarea id="page-channel-update" value={content} onChange={event => setContent(event.target.value)} maxLength={2000} rows={3} placeholder={t.placeholder} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-slate-500" /><div className="flex items-center justify-between"><span className="text-[10px] text-slate-500">{content.length}/2000</span><button type="submit" disabled={busy || !content.trim()} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Send className="h-3.5 w-3.5" />{t.publish}</button></div></form>}
  {canRead && updates.length === 0 && <p className="text-xs text-slate-400">{t.empty}</p>}
  {canRead && updates.map(update => <article key={update.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3"><p className="whitespace-pre-wrap break-words text-sm text-slate-100">{update.content}</p><div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2"><span className="text-[10px] text-slate-500">{update.createdAt && typeof (update.createdAt as any).toDate === 'function' ? (update.createdAt as any).toDate().toLocaleString() : t.recent}</span>{isOwner && <button type="button" disabled={busy} onClick={() => void remove(update.id)} aria-label="Delete channel update" className="text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>}</div></article>)}
  {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}{notice && <p role="status" className="text-xs text-emerald-300">{notice}</p>}
 </section>;
}
