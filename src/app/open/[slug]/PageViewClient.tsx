"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Share2, CheckCircle2, Globe2, CalendarDays, List, X, ShieldCheck, Newspaper, MapPin, Tag, Briefcase, Utensils, Coffee, House, Car, Dumbbell, Heart, Leaf, Gift, Hammer, PawPrint, Sparkles } from "lucide-react";
import { FaFacebookF, FaInstagram } from "react-icons/fa";

export type Post = {
 id: string; title: string; content?: string | null; image_url?: string | null;
 type?: string | null; created_at?: string | null; expires_at?: string | null;
 event_start?: string | null; event_end?: string | null; deal_price?: string | number | null;
 metadata?: { active_dates?: string[]; [key: string]: unknown } | null;
};
export type Place = { id: string; title: string; slug?: string | null; description?: string | null; location_name?: string | null; address?: string | null; postcode?: string | null; images?: unknown; is_24_7?: boolean | null };
export type PageData = { id: string; name: string; slug: string | null; description: string | null; logo_url: string | null; brand_color: string | null; website: string | null; showcase_images: unknown; is_local_partner: boolean | null; status: string | null; is_public: boolean | null; layout: { socials?: {facebook?: string | null; instagram?: string | null} | null; facebook?: string | null; instagram?: string | null; partner_features?: {branded_calendar?: boolean; menu_enabled?: boolean; menu_title?: string; menu_items?: unknown} | null } | null };
export type Batch = { posts: Post[]; places: Place[]; postOffset: number; placeOffset: number; morePosts: boolean; morePlaces: boolean; error?: string };
type PartnerMenuItem = { id: string; title: string; description: string; price: string; icon: string };
const MENU_ICONS = { "restaurant-outline": Utensils, "cafe-outline": Coffee, "briefcase-outline": Briefcase, "home-outline": House, "car-outline": Car, "fitness-outline": Dumbbell, "heart-outline": Heart, "leaf-outline": Leaf, "gift-outline": Gift, "hammer-outline": Hammer, "paw-outline": PawPrint, "sparkles-outline": Sparkles };
const MENU_ICON_OPTIONS = Object.keys(MENU_ICONS);
// Adjust these two route helpers if your existing detail pages use different paths.
const postHref = (post: Post) => `/posts/${encodeURIComponent(post.id)}`;
const placeHref = (place: Place) => `/places/${encodeURIComponent(place.slug || place.id)}`;
function normaliseHex(value: string | null | undefined) {
  const clean = value?.trim();
  if (clean && /^#[0-9A-Fa-f]{6}$/.test(clean)) return clean;
  return '#005744';
}

function getReadableTextColour(hex: string) {
  const clean = hex.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return '#FFFFFF';

  const red = parseInt(clean.slice(0, 2), 16);
  const green = parseInt(clean.slice(2, 4), 16);
  const blue = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? '#111111' : '#FFFFFF';
}

function getAccessibleLinkColour(hex: string) {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return '#005744';

  const red = parseInt(clean.slice(0, 2), 16);
  const green = parseInt(clean.slice(2, 4), 16);
  const blue = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  if (luminance < 0.62) return `#${clean}`;

  const darken = (value: number) =>
    Math.max(0, Math.round(value * 0.5)).toString(16).padStart(2, '0');

  return `#${darken(red)}${darken(green)}${darken(blue)}`;
}

function normaliseImages(value: unknown, maxImages: number) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): string | null => {
      if (typeof item === 'string') return item.trim() || null;

      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        const possible =
          record.url ?? record.image_url ?? record.src ?? record.publicUrl;
        return typeof possible === 'string' ? possible.trim() || null : null;
      }

      return null;
    })
    .filter((item): item is string => Boolean(item))
    .slice(0, maxImages);
}

function isMenuIcon(value: unknown): value is string {
  return MENU_ICON_OPTIONS.includes(value as string);
}

function normaliseMenuItems(value: unknown): PartnerMenuItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): PartnerMenuItem | null => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      if (!title) return null;

      return {
        id: typeof row.id === 'string' ? row.id : title,
        title,
        description: typeof row.description === 'string' ? row.description.trim() : '',
        price: typeof row.price === 'string' ? row.price.trim() : '',
        icon: isMenuIcon(row.icon) ? row.icon : 'briefcase-outline',
      };
    })
    .filter((item): item is PartnerMenuItem => Boolean(item));
}

function normaliseWebsite(value: string | null | undefined) {
  const clean = value?.trim();
  if (!clean) return null;
  try { const url = new URL(/^https?:\/\//i.test(clean) ? clean : `https://${clean}`); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}

function normaliseSocial(
  value: string | null | undefined,
  network: 'facebook' | 'instagram'
) {
  const clean = value?.trim();
  if (!clean) return null;
  if (/^https?:\/\//i.test(clean)) return clean;

  let handle = clean.replace(/^@/, '').replace(/^www\./i, '');

  if (network === 'facebook') {
    handle = handle.replace(/^facebook\.com\//i, '');
    return `https://www.facebook.com/${handle}`;
  }

  handle = handle.replace(/^instagram\.com\//i, '');
  return `https://www.instagram.com/${handle}`;
}

function isPostActive(post: Post) {
  const now = Date.now();

  if (post.expires_at) {
    const expiry = new Date(post.expires_at).getTime();
    if (!Number.isNaN(expiry) && expiry < now) return false;
  }

  if (post.type === 'event' || post.type === 'deal') {
    const activeDates = Array.isArray(post.metadata?.active_dates) ? post.metadata.active_dates : [];

    if (activeDates.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      return activeDates.some((date) => String(date).slice(0, 10) >= today);
    }

    const finalDate = post.event_end ?? post.event_start;
    if (finalDate) {
      const end = new Date(finalDate).getTime();
      if (!Number.isNaN(end) && end < now) return false;
    }
  }

  return true;
}

function datesForPost(post: Post) {
  const activeDates = Array.isArray(post.metadata?.active_dates) ? post.metadata.active_dates : [];
  if (activeDates.length > 0) {
    return activeDates.map((date) => String(date).slice(0, 10));
  }

  if (post.event_start) {
    const eventDate = new Date(post.event_start);
    if (!Number.isNaN(eventDate.getTime())) {
      const year = eventDate.getFullYear();
      const month = String(eventDate.getMonth() + 1).padStart(2, '0');
      const day = String(eventDate.getDate()).padStart(2, '0');
      return [`${year}-${month}-${day}`];
    }
  }

  return [];
}


function Calendar({ posts }: { posts: Post[] }) {
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today.getDate());
  const year = month.getFullYear(), m = month.getMonth();
  const monthName = month.toLocaleString('en-GB', { month: 'long' });
  const previous = month > new Date(today.getFullYear(), today.getMonth(), 1);
  const offset = (new Date(year, m, 1).getDay() + 6) % 7;
  const count = new Date(year, m + 1, 0).getDate();
  const key = (day: number) => `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const past = (day: number) => new Date(year, m, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isToday = (day: number) => year === today.getFullYear() && m === today.getMonth() && day === today.getDate();
  const forDay = (day: number) => past(day) ? [] : posts.filter(p => (p.type === 'event' || p.type === 'deal') && datesForPost(p).includes(key(day)));
  const selectedPosts = forDay(selected);
  function move(delta: number) {
    const next = new Date(year, m + delta, 1);
    setMonth(next);
    setSelected(next.getMonth() === today.getMonth() && next.getFullYear() === today.getFullYear() ? today.getDate() : 1);
  }
  return <section className="partner-calendar" aria-label="Page calendar">
    <div className="brand-heading"><div><span className="eyebrow">LOCAL PARTNER</span><h2>Calendar</h2></div><CalendarDays size={25}/></div>
    <div className="calendar-card">
      <div className="month-header"><button className="arrow" aria-label="Previous month" disabled={!previous} onClick={() => move(-1)}><ArrowLeft size={21}/></button><div aria-live="polite"><h3>{monthName}</h3><p>{year}</p></div><button className="arrow" aria-label="Next month" onClick={() => move(1)}><ArrowRight size={21}/></button></div>
      <div className="week-row" aria-hidden="true">{['M','T','W','T','F','S','S'].map((d,i) => <span key={i}>{d}</span>)}</div>
      <div className="calendar-grid">{Array.from({length: Math.ceil((offset + count) / 7) * 7}, (_, i) => {
        const day = i - offset + 1;
        if (day < 1 || day > count) return <div key={i} className="day empty-day"/>;
        const dayPosts = forDay(day);
        return <button key={i} className={`day ${selected === day && !past(day) ? 'selected' : isToday(day) ? 'today' : ''}`} disabled={past(day)} aria-pressed={selected === day && !past(day)} aria-current={isToday(day) ? 'date' : undefined} aria-label={`${day} ${monthName} ${year}, ${dayPosts.length} posts`} onClick={() => setSelected(day)}><span>{day}</span><span className="dots">{dayPosts.some(p=>p.type==='event') && <i/>}{dayPosts.some(p=>p.type==='deal') && <i className="deal-dot"/>}</span></button>;
      })}</div>
    </div>
    <div className="selected-header"><div><span className="selected-label">{isToday(selected) ? 'TODAY' : 'SELECTED DATE'}</span><h3>{selected} {monthName}</h3></div><span className="count-badge">{selectedPosts.length} {selectedPosts.length === 1 ? 'post' : 'posts'}</span></div>
    <div aria-live="polite">{selectedPosts.length ? <div className="calendar-posts">{selectedPosts.map(post => <Link className="calendar-post" key={post.id} href={postHref(post)}><span className={`tile-icon ${post.type === 'deal' ? 'deal-icon' : ''}`}>{post.type === 'deal' ? <Tag size={20}/> : <CalendarDays size={20}/>}</span><div><span className="eyebrow">{post.type === 'deal' ? 'DEAL' : 'EVENT'}</span><h3>{post.title}</h3></div><ArrowRight size={18}/></Link>)}</div> : <div className="empty-calendar"><CalendarDays size={26}/><h3>Nothing here yet</h3><p>Events and Deals on this date will appear here.</p></div>}</div>
  </section>;
}

function Gallery({ photos, name, partner }: {photos: string[]; name: string; partner: boolean}) {
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (index === null) { dialog.current?.close(); return; }
    if (!dialog.current?.open) dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [index]);
  return <section className="section"><div className="section-heading"><div>{partner && <span className="eyebrow accent">LOCAL PARTNER</span>}<h2>{partner ? 'Gallery' : 'Photos'}</h2></div><span className="section-count">{photos.length}</span></div>
    <div className="gallery-grid">{photos.map((src,i) => <button className={`gallery-thumb ${partner ? 'partner-thumb' : ''}`} key={`${src}-${i}`} aria-label={`Open ${name} photo ${i+1}`} onClick={()=>setIndex(i)}><Image src={src} alt={`${name} ${i+1}`} fill sizes="(min-width: 960px) 300px, 33vw" unoptimized /></button>)}</div><p className="gallery-hint">Tap an image to open it.</p>
    <dialog ref={dialog} className="gallery-dialog" aria-label={`${name} gallery`} onCancel={()=>setIndex(null)} onClose={()=>setIndex(null)} onClick={e=>{if(e.target===e.currentTarget)setIndex(null);}} onKeyDown={e=>{if(e.key==='ArrowLeft'){e.preventDefault();setIndex(v=>v===null?null:Math.max(0,v-1));} if(e.key==='ArrowRight'){e.preventDefault();setIndex(v=>v===null?null:Math.min(photos.length-1,v+1));}}}>
      <button className="modal-close" aria-label="Close gallery" onClick={()=>setIndex(null)}><X size={26}/></button>
      {index!==null && <div className="modal-image"><Image src={photos[index]} alt={`${name} ${index+1}`} fill sizes="100vw" unoptimized /></div>}
      <div className="modal-bottom"><button aria-label="Previous photo" disabled={index===0} onClick={()=>setIndex(v=>v===null?null:Math.max(0,v-1))}><ArrowLeft/></button><span aria-live="polite">{index!==null ? `${index+1} / ${photos.length}` : ''}</span><button aria-label="Next photo" disabled={index===photos.length-1} onClick={()=>setIndex(v=>v===null?null:Math.min(photos.length-1,v+1))}><ArrowRight/></button></div>
    </dialog>
  </section>;
}

export default function PageViewClient({ page, initial, loadMore }: {page: PageData; initial: Batch; loadMore: (postOffset: number, placeOffset: number, morePosts: boolean, morePlaces: boolean) => Promise<Batch>}) {
  const [batch, setBatch] = useState(initial);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState(initial.error || '');
  const [shareStatus, setShareStatus] = useState('');
  const sentinel = useRef<HTMLDivElement>(null);
  const accent = normaliseHex(page.brand_color);
  const partner = page.is_local_partner === true;
  const features = page.layout?.partner_features;
  const items = normaliseMenuItems(features?.menu_items);
  const photos = normaliseImages(page.showcase_images, partner ? 20 : 3);
  const posts = batch.posts.filter(isPostActive).filter(p=>p.type!=='alert');
  const website = normaliseWebsite(page.website);
  const instagram = normaliseSocial(page.layout?.socials?.instagram ?? page.layout?.instagram, 'instagram');
  const facebook = normaliseSocial(page.layout?.socials?.facebook ?? page.layout?.facebook, 'facebook');
  async function more() {
    if(locked.current || (!batch.morePosts && !batch.morePlaces)) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const result = await loadMore(batch.postOffset,batch.placeOffset,batch.morePosts,batch.morePlaces);
      if(result.error) throw new Error(result.error);
      setBatch(old=>({...result,posts:Array.from(new Map([...old.posts,...result.posts].map(p=>[p.id,p])).values()),places:Array.from(new Map([...old.places,...result.places].map(p=>[p.id,p])).values())}));
    } catch { setError('Unable to load content. Please try again.'); }
    finally { locked.current=false;setBusy(false); }
  }
  useEffect(()=>{
    if(error || busy || (!batch.morePosts && !batch.morePlaces)) return;
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))void more();},{rootMargin:'650px'});
    if(sentinel.current)observer.observe(sentinel.current);
    return ()=>observer.disconnect();
    // Recreate after each batch so short/expired batches continue loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[batch,busy,error]);
  async function share() {
    const url=`https://eastlothian.online/open/${encodeURIComponent(page.slug?.trim() || page.id)}`;
    try {
      if(navigator.share) await navigator.share({title:`${page.name} on East Lothian Online`,text:`${page.name} on East Lothian Online`,url});
      else {await navigator.clipboard.writeText(url);setShareStatus('Link copied.');}
    } catch (err) {if(!(err instanceof DOMException && err.name==='AbortError'))setShareStatus(url);}
  }
  return <main className="elo-page" style={{'--accent':accent,'--on-accent':getReadableTextColour(accent),'--link':getAccessibleLinkColour(accent),'--tint':`${accent}15`} as CSSProperties}>
    <div className="page-shell">
      <section className="hero">
        <svg className="hero-shards" width="100%" height="100%" viewBox="0 0 400 190" preserveAspectRatio="none" aria-hidden="true">{[['0,0 108,0 65,82 0,109','#FFFFFF',.08],['108,0 228,0 167,76 65,82','#000000',.07],['228,0 330,0 279,94 167,76','#FFFFFF',.11],['330,0 400,0 400,81 279,94','#000000',.08],['0,109 65,82 130,190 0,190','#000000',.05],['65,82 167,76 220,190 130,190','#FFFFFF',.07],['167,76 279,94 322,190 220,190','#000000',.09],['279,94 400,81 400,190 322,190','#FFFFFF',.08]].map(([points,fill,opacity],i)=><polygon key={i} points={String(points)} fill={String(fill)} fillOpacity={Number(opacity)}/>)}</svg>
        <button className="share-button" aria-label="Share page" onClick={()=>void share()}><Share2 size={21}/></button>
        {page.logo_url && <div className="logo-badge"><Image src={page.logo_url} alt={`${page.name} logo`} fill sizes="68px" unoptimized priority /></div>}
        <div className="hero-content"><div className="hero-eyebrow"><span>OFFICIAL ELO PAGE</span>{partner && <><i/><CheckCircle2 size={14}/><span>LOCAL PARTNER</span></>}</div><h1>{page.name}</h1></div>
      </section>
      {shareStatus && <p className="share-status" role="status">{shareStatus}</p>}
      {(website || instagram || facebook) && <nav className="page-links" aria-label="Page links">{website && <a href={website} target="_blank" rel="noopener noreferrer"><Globe2 size={21}/>Website</a>}{instagram && <a href={instagram} target="_blank" rel="noopener noreferrer"><FaInstagram size={21}/>Instagram</a>}{facebook && <a href={facebook} target="_blank" rel="noopener noreferrer"><FaFacebookF size={21}/>Facebook</a>}</nav>}
      {page.description && <section className="section"><h2 className="section-label">ABOUT</h2><p className="about-text">{page.description}</p></section>}
      <div className="partner-layout">
        {partner && (features?.branded_calendar ?? true) && <Calendar posts={posts}/>}
        {partner && (features?.menu_enabled ?? true) && items.length>0 && <section className="partner-menu"><div className="brand-heading"><div><span className="eyebrow">LOCAL PARTNER</span><h2>{features?.menu_title?.trim() || 'Menu & Services'}</h2></div><List size={25}/></div><div className="menu-body">{items.map((item,i)=>{const Icon=MENU_ICONS[item.icon as keyof typeof MENU_ICONS] || Briefcase;return <div className="menu-row" key={`${item.id}-${i}`}><span className="tile-icon"><Icon size={21}/></span><div className="menu-text"><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}</div>{item.price && <span className="menu-price">{item.price}</span>}</div>;})}</div></section>}
      </div>
      {photos.length>0 && <Gallery photos={photos} name={page.name} partner={partner}/>}
      {batch.places.length>0 && <section className="feed-section"><div className="section-heading"><h2>Our places</h2><span className="section-count">{batch.places.length}</span></div><div className="feed-grid">{batch.places.map(place=>{const src=normaliseImages(place.images,1)[0];return <Link className="feed-card" key={place.id} href={placeHref(place)}>{src && <div className="feed-image"><Image src={src} alt={place.title} fill sizes="(min-width: 960px) 450px, 100vw" unoptimized/></div>}<div className="feed-body"><span className="eyebrow accent">PLACE</span><h3>{place.title}</h3>{place.description && <p>{place.description}</p>}<span className="place-address"><MapPin size={15}/>{place.location_name || place.address || place.postcode}</span>{place.is_24_7 && <span className="always-open">Open 24/7</span>}</div></Link>;})}</div></section>}
      <section className="feed-section"><div className="latest-heading"><span className="eyebrow">LATEST</span><h2>From {page.name}</h2></div>{posts.length===0 ? <div className="empty-posts"><Newspaper size={27}/><h3>Nothing new right now</h3><p>Check back soon for updates from {page.name}.</p></div> : <div className="feed-grid">{posts.map(post=><Link className={`feed-card post-${post.type || 'general'}`} href={postHref(post)} key={post.id}>{post.image_url && <div className="feed-image"><Image src={post.image_url} alt={post.title} fill sizes="(min-width: 960px) 450px, 100vw" unoptimized/></div>}<div className="feed-body"><span className="eyebrow accent">{post.type==='popup' ? 'POP-UP' : (post.type || 'POST').toUpperCase()}</span><h3>{post.title}</h3>{post.content && <p>{post.content}</p>}{post.type==='deal' && post.deal_price!=null && <strong className="deal-price">{typeof post.deal_price==='number' ? new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(post.deal_price) : post.deal_price}</strong>}{post.event_start && !Number.isNaN(new Date(post.event_start).getTime()) && <span className="post-date"><CalendarDays size={15}/>{new Date(post.event_start).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</span>}</div></Link>)}</div>}</section>
      <div ref={sentinel} className="load-more" aria-live="polite">{error && <p role="alert">{error}</p>}{(batch.morePosts || batch.morePlaces) && <button disabled={busy} onClick={()=>void more()}>{busy ? 'Loading…' : error ? 'Try again' : 'Load more'}</button>}</div>
      <div className="official-footer"><ShieldCheck size={19}/><p>This is the official {page.name} Page on East Lothian Online.</p></div>
    </div>
    <style>{CSS}</style>
  </main>;
}

const CSS = `
.elo-page{background:#F4F5F4;color:#14221E;min-height:100vh;padding-bottom:80px}.elo-page *{box-sizing:border-box}.elo-page h1,.elo-page h2,.elo-page h3,.elo-page p{margin:0}.elo-page button,.elo-page a{-webkit-tap-highlight-color:transparent}.elo-page button{font:inherit;cursor:pointer}.elo-page button:disabled{cursor:default}.elo-page a{color:inherit;text-decoration:none}.elo-page :focus-visible{outline:3px solid var(--link);outline-offset:4px}.elo-page svg{flex-shrink:0}.page-shell{max-width:1000px;margin:auto}.hero{min-height:190px;position:relative;overflow:hidden;display:flex;align-items:flex-end;background:var(--accent);color:var(--on-accent)}.hero-shards{position:absolute;inset:0;pointer-events:none}.share-button{position:absolute;z-index:2;top:16px;left:16px;width:44px;height:44px;border-radius:50%;background:#fffffff2;color:#173C33;border:1px solid #00000014;display:grid;place-items:center}.logo-badge{position:absolute;z-index:2;top:14px;right:16px;width:68px;height:68px;border:4px solid white;border-radius:50%;background:white;overflow:hidden;box-shadow:0 2px 6px #00000024}.logo-badge img{object-fit:contain}.hero-content{position:relative;padding:92px 18px 23px;width:100%}.hero-eyebrow{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-bottom:8px;font-size:8px;font-weight:900;letter-spacing:1.1px}.hero-eyebrow span{opacity:.76}.hero-eyebrow i{width:3px;height:3px;border-radius:50%;background:currentColor;opacity:.55;margin:0 2px}.hero h1{font-size:30px;line-height:34px;font-weight:900;letter-spacing:-.7px;overflow-wrap:anywhere}.page-links{min-height:55px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;padding:0 10px;border-bottom:1px solid #D9DFDC}.page-links a{display:flex;align-items:center;gap:6px;padding:15px 12px;font-size:11px;font-weight:800;color:var(--link)}.share-status{padding:10px 18px;overflow-wrap:anywhere;font-size:12px}.section{padding:24px 18px;border-bottom:1px solid #D9DFDC}.elo-page .section-label{color:#78827E;font-size:8px;font-weight:900;letter-spacing:1.2px;margin-bottom:9px}.about-text{color:#35423E;font-size:15px;line-height:23px;white-space:pre-wrap;overflow-wrap:anywhere}.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:14px}.section-heading h2{font-size:20px;font-weight:900;letter-spacing:-.35px}.section-count{color:#84908C;font-size:11px;font-weight:800}.eyebrow{display:block;font-size:8px;font-weight:900;letter-spacing:1.1px}.accent{color:var(--link)}.partner-calendar{margin:22px 16px 0;min-width:0}.brand-heading{min-height:76px;border-radius:20px 20px 0 0;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:14px;background:var(--accent);color:var(--on-accent)}.brand-heading .eyebrow{opacity:.74}.brand-heading h2{margin-top:2px;font-size:22px;line-height:26px;font-weight:900;overflow-wrap:anywhere}.calendar-card{background:white;border:1px solid #E4E4E4;border-top:0;border-radius:0 0 20px 20px;padding:16px}.month-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;text-align:center}.month-header h3{font-size:20px;font-weight:800;color:#111}.month-header p{font-size:12px;font-weight:600;color:#858585;margin-top:2px}.arrow{width:42px;height:42px;border:0;background:#F4F5F4;border-radius:12px;display:grid;place-items:center}.arrow:disabled{opacity:.5;color:#C5C5C5}.week-row{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));margin-bottom:7px;text-align:center;font-size:11px;font-weight:800;color:#909090}.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-top:1px solid #E5E5E5;border-left:1px solid #E5E5E5}.day{height:52px;border:0;border-right:1px solid #E5E5E5;border-bottom:1px solid #E5E5E5;background:white;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#222;font-size:14px!important;font-weight:700!important}.day:disabled{color:#D0D0D0}.empty-day{background:#FAFAFA}.today{background:#E8F4F0;color:var(--link)}.selected{background:var(--accent);color:var(--on-accent);font-weight:900!important}.dots{display:flex;gap:3px;margin-top:4px;height:4px}.dots i{width:4px;height:4px;border-radius:50%;background:var(--accent)}.dots .deal-dot{background:#E49B28}.selected .dots i{background:var(--on-accent)}.selected-header{display:flex;align-items:center;justify-content:space-between;margin:18px 0 10px}.selected-label{font-size:9px;font-weight:800;letter-spacing:1px;color:#999}.selected-header h3{font-size:19px;font-weight:800;color:#111;margin-top:3px}.count-badge{padding:7px 10px;border-radius:10px;font-size:11px;font-weight:800;background:var(--tint);color:var(--link)}.empty-calendar{background:white;border:1px solid #E7E7E7;border-radius:17px;padding:22px;display:flex;align-items:center;flex-direction:column;color:var(--link)}.empty-calendar h3{font-size:15px;font-weight:800;color:#111;margin-top:9px}.empty-calendar p{font-size:11px;line-height:17px;color:#777;text-align:center;margin-top:5px}.calendar-posts{display:grid;gap:9px}.calendar-post{min-height:72px;background:white;border:1px solid #E5E5E5;border-radius:16px;display:flex;align-items:center;padding:11px;gap:11px}.calendar-post>div{flex:1;min-width:0}.calendar-post h3{font-size:13px;line-height:17px;font-weight:900;overflow-wrap:anywhere}.calendar-post .eyebrow{color:var(--link);margin-bottom:3px}.calendar-post>svg{color:#98A19E}.tile-icon{width:44px;height:44px;flex-shrink:0;border-radius:13px;display:grid;place-items:center;background:var(--tint);color:var(--link)}.deal-icon{background:#FFF3DF;color:#965A00}.partner-menu{margin:22px 16px 0;border-radius:20px;background:white;overflow:hidden;border:1px solid #E1E6E4;align-self:start;min-width:0}.partner-menu .brand-heading{min-height:82px}.menu-body{padding:0 15px}.menu-row{display:flex;align-items:center;gap:11px;padding:14px 0;border-bottom:1px solid #E2E6E4}.menu-row:last-child{border:0}.menu-text{flex:1;min-width:0;overflow-wrap:anywhere}.menu-text h3{font-size:14px;font-weight:900;color:#16221E}.menu-text p{margin-top:4px;color:#74807C;font-size:11px;line-height:16px;font-weight:600;white-space:pre-wrap}.menu-price{max-width:100px;overflow-wrap:anywhere;text-align:right;font-size:13px;font-weight:900;color:var(--link)}.gallery-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.gallery-thumb{position:relative;aspect-ratio:1;border:1px solid #E2E6E4;border-radius:13px;overflow:hidden;background:#E2E6E4;padding:0}.partner-thumb{border:2px solid var(--accent)}.gallery-thumb img{object-fit:cover}.elo-page .gallery-hint{margin-top:9px;color:#8A9490;font-size:9px;font-weight:700}.section-heading .eyebrow{margin-bottom:3px}.gallery-dialog{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;margin:0;padding:0;background:#000000f5;color:white}.gallery-dialog::backdrop{background:#000}.modal-close{position:absolute;z-index:2;top:calc(18px + env(safe-area-inset-top));right:18px;width:44px;height:44px;border:0;border-radius:50%;background:#ffffff1f;color:white;display:grid;place-items:center}.modal-image{position:absolute;top:12%;left:0;width:100%;height:76%;pointer-events:none}.modal-image img{object-fit:contain}.modal-bottom{position:absolute;bottom:calc(24px + env(safe-area-inset-bottom));left:24px;right:24px;display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:900}.modal-bottom button{width:46px;height:46px;border:0;border-radius:50%;background:#ffffff21;color:white;display:grid;place-items:center}.modal-bottom button:disabled{opacity:.25}.feed-section{padding:24px 16px 0}.latest-heading{margin:0 2px 15px}.latest-heading .eyebrow{color:#78827E;margin-bottom:4px}.latest-heading h2{font-size:22px;line-height:27px;font-weight:900;letter-spacing:-.4px;overflow-wrap:anywhere}.feed-grid{display:grid;gap:16px}.feed-card{min-width:0;background:white;border:1px solid #E1E6E4;border-radius:20px;overflow:hidden;display:block;align-self:start}.feed-image{position:relative;aspect-ratio:16/10;background:#E2E6E4}.feed-image img{object-fit:cover}.feed-body{padding:16px}.feed-body h3{font-size:19px;line-height:25px;font-weight:900;margin-top:6px;overflow-wrap:anywhere}.feed-body p{font-size:13px;line-height:20px;color:#74807C;margin-top:8px;white-space:pre-wrap;overflow-wrap:anywhere}.place-address,.post-date{display:flex;align-items:center;gap:6px;margin-top:12px;font-size:11px;color:#68736F}.always-open,.deal-price{display:block;margin-top:10px;font-size:13px;color:var(--link);font-weight:800}.post-deal{border-color:var(--accent)}.empty-posts{padding:38px 22px;margin-bottom:18px;display:flex;flex-direction:column;align-items:center;text-align:center;color:#84908C}.empty-posts h3{font-size:16px;font-weight:900;color:#263833;margin-top:10px}.empty-posts p{color:#78827E;font-size:12px;line-height:19px;margin-top:5px}.load-more{display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:16px;font-size:12px}.load-more button{padding:10px 18px;border:1px solid #D9DFDC;border-radius:12px;color:var(--link);background:white;font-weight:800}.load-more button:disabled{opacity:.6}.official-footer{display:flex;align-items:flex-start;gap:9px;margin:15px 18px 0;padding-top:18px;border-top:1px solid #D9DFDC;color:#68736F}.official-footer p{flex:1;font-size:11px;line-height:17px;font-weight:600}.elo-page a:hover,.elo-page button:not(:disabled):hover{filter:brightness(.96)}
@media(min-width:768px){.page-shell{padding:24px 24px 0}.hero{border-radius:24px;min-height:240px}.hero-content{padding:108px 28px 28px}.hero h1{font-size:40px;line-height:46px}.hero-eyebrow{font-size:10px}.page-links a{font-size:13px}.gallery-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.feed-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.section{padding:28px 18px}.partner-layout{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.partner-layout>:only-child{grid-column:1/-1;max-width:600px;width:calc(100% - 32px);justify-self:center}.partner-layout:empty{display:none}}
@media(prefers-reduced-motion:no-preference){.elo-page a,.elo-page button{transition:filter .15s ease}}
`;
