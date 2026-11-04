import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, Clock3, Plus, PauseCircle, PlayCircle, Send } from 'lucide-react';
import {
  listBusinessServices, publishBusinessServiceListing, setBusinessServiceListingStatus,
  type BusinessServiceListing,
} from '../services/firebase/businessServicesService';
import {
  requestBusinessBooking, respondToBusinessBooking, watchCustomerBookings, watchPageBookingRequests,
  type BusinessBookingRequest,
} from '../services/firebase/businessBookingService';

interface Props {
  pageId: string;
  ownerId: string;
  currentUserId: string;
}

function localDateTimeMinimum(): string {
  const date = new Date(Date.now() + 60_000);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export default function BusinessServicesPanel({ pageId, ownerId, currentUserId }: Props) {
  const isOwner = currentUserId === ownerId;
  const [services, setServices] = useState<BusinessServiceListing[]>([]);
  const [bookings, setBookings] = useState<BusinessBookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [requestedAt, setRequestedAt] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshServices = async () => {
    setLoading(true);
    try { setServices(await listBusinessServices(pageId, isOwner)); setError(''); }
    catch { setError('Business services are temporarily unavailable.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refreshServices(); }, [pageId, isOwner]);

  useEffect(() => {
    if (!currentUserId) return;
    if (isOwner) {
      return watchPageBookingRequests(currentUserId, pageId, setBookings, () => setError('Booking requests could not be loaded.'));
    }
    return watchCustomerBookings(currentUserId, items => setBookings(items.filter(item => item.pageId === pageId)),
      () => setError('Your booking history could not be loaded.'));
  }, [currentUserId, isOwner, pageId]);

  const pendingCount = useMemo(() => bookings.filter(item => item.status === 'pending').length, [bookings]);

  const createService = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      await publishBusinessServiceListing(currentUserId, pageId, {
        name, description, durationMinutes: Number(duration),
        ...(price.trim() ? { priceMinor: Math.round(Number(price) * 100) } : {}),
        currency: 'NGN',
      });
      setName(''); setDescription(''); setPrice('');
      setNotice('Service published.'); await refreshServices();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The service could not be published.'); }
    finally { setBusy(false); }
  };

  const toggleService = async (service: BusinessServiceListing) => {
    setBusy(true); setError('');
    try {
      await setBusinessServiceListingStatus(currentUserId, pageId, service.id, service.status === 'active' ? 'paused' : 'active');
      setNotice(service.status === 'active' ? 'Service paused.' : 'Service is available again.');
      await refreshServices();
    } catch { setError('The service status could not be updated.'); }
    finally { setBusy(false); }
  };

  const submitBooking = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await requestBusinessBooking({
        pageId, serviceId: selectedService, requestedAt: new Date(requestedAt), note,
      });
      setNotice(result.created ? 'Your booking request was sent. The business must confirm it.' : 'Your booking request was already received.');
      setNote('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your booking request could not be sent.'); }
    finally { setBusy(false); }
  };

  const resolveBooking = async (bookingId: string, decision: 'accepted' | 'declined') => {
    setBusy(true); setError('');
    try { await respondToBusinessBooking(bookingId, decision); setNotice(decision === 'accepted' ? 'Booking request accepted.' : 'Booking request declined.'); }
    catch { setError('The booking request could not be updated.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="mt-6 rounded-2xl border border-violet-400/20 bg-[#0b1020] p-4 sm:p-5 space-y-4" aria-labelledby="business-services-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="business-services-heading" className="text-base font-bold text-white">Services & bookings</h3>
          <p className="text-xs text-slate-400">{isOwner ? `${pendingCount} pending request${pendingCount === 1 ? '' : 's'}` : 'Request an appointment with this business'}</p>
        </div>
        <CalendarClock className="h-5 w-5 text-violet-300" aria-hidden="true" />
      </div>

      {isOwner && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
          <h4 className="text-sm font-semibold text-white">Publish a service</h4>
          <label className="block text-xs text-slate-300">Service name<input value={name} onChange={e => setName(e.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
          <label className="block text-xs text-slate-300">Description<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1200} rows={2} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-300">Duration (minutes)<input type="number" min="5" max="1440" value={duration} onChange={e => setDuration(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
            <label className="text-xs text-slate-300">Indicative price (₦)<input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
          </div>
          <button type="button" disabled={busy || !name.trim() || Number(duration) < 5 || Number(duration) > 1440 || (price.trim() && (!Number.isFinite(Number(price)) || Number(price) < 0))} onClick={() => void createService()} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Publish service</button>
        </div>
      )}

      {loading ? <p className="text-sm text-slate-400">Loading services…</p> : services.length === 0
        ? <p className="text-sm text-slate-400">No services are listed yet.</p>
        : <div className="space-y-2">{services.map(service => (
          <article key={service.id} className="rounded-xl border border-white/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-semibold text-white">{service.name}</h4>
                {service.description && <p className="mt-1 text-sm text-slate-300">{service.description}</p>}
                <p className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400"><span><Clock3 className="mr-1 inline h-3 w-3" />{service.durationMinutes} min</span>{service.priceMinor !== null && <span>{service.currency} {(service.priceMinor / 100).toLocaleString()}</span>}</p>
              </div>
              {isOwner ? <button type="button" disabled={busy} onClick={() => void toggleService(service)} className="shrink-0 text-xs text-violet-300">{service.status === 'active' ? <><PauseCircle className="mr-1 inline h-4 w-4" />Pause</> : <><PlayCircle className="mr-1 inline h-4 w-4" />Activate</>}</button>
                : <button type="button" onClick={() => setSelectedService(service.id)} aria-pressed={selectedService === service.id} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${selectedService === service.id ? 'bg-violet-600 text-white' : 'border border-violet-400/40 text-violet-200'}`}>{selectedService === service.id ? 'Selected' : 'Choose'}</button>}
            </div>
          </article>
        ))}</div>}

      {!isOwner && selectedService && (
        <div className="rounded-xl border border-violet-400/20 p-3 space-y-3">
          <h4 className="text-sm font-semibold text-white">Request a booking</h4>
          <label className="block text-xs text-slate-300">Preferred date and time<input type="datetime-local" min={localDateTimeMinimum()} value={requestedAt} onChange={e => setRequestedAt(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
          <label className="block text-xs text-slate-300">Note (optional)<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} rows={2} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
          <button type="button" disabled={busy || !requestedAt || new Date(requestedAt).getTime() <= Date.now()} onClick={() => void submitBooking()} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4" />Send request</button>
        </div>
      )}

      {bookings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-white">{isOwner ? 'Booking requests' : 'Your requests'}</h4>
          {bookings.map(booking => (
            <article key={booking.id} className="rounded-xl border border-white/10 p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-white">{booking.serviceName}</p><span className="rounded-full bg-white/10 px-2 py-1 text-xs capitalize text-slate-300">{booking.status}</span></div>
              <p className="mt-1 text-xs text-slate-400">{new Date(booking.requestedAt instanceof Date ? booking.requestedAt : booking.requestedAt.toDate()).toLocaleString()}</p>
              {booking.note && <p className="mt-2 text-sm text-slate-300">{booking.note}</p>}
              {isOwner && booking.status === 'pending' && <div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={() => void resolveBooking(booking.id, 'accepted')} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white"><Check className="mr-1 inline h-3 w-3" />Accept</button><button type="button" disabled={busy} onClick={() => void resolveBooking(booking.id, 'declined')} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-200">Decline</button></div>}
            </article>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
    </section>
  );
}
