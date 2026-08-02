"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight,
  ImagePlus, LoaderCircle, Megaphone, PoundSterling, Trash2, X, MapPin,
  Newspaper,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

type PostType = "event" | "deal" | "alert" | "update" | "popup" | "advert";
type DealKind = "price" | "free" | "percent" | "multibuy";

type PostMetadata = {
  active_dates?: unknown;
  public_type?: string | null;
  alert_icon?: string | null;
  deal_kind?: string | null;
  deal_price?: number | null;
  discount_percent?: number | null;
  buy_quantity?: number | null;
  pay_quantity?: number | null;
  image_urls?: string[] | null;
  popup_address?: string | null;
  popup_start_time?: string | null;
  popup_end_time?: string | null;
  advert_cta?: string | null;
  advert_url?: string | null;
  [key: string]: unknown;
};

type DatabasePost = {
  id: string; group_id: string; title: string | null; content: string | null;
  type: string | null; image_url: string | null; event_start: string | null;
  event_end: string | null; expires_at: string | null; metadata: PostMetadata | null;
};

function normaliseDate(date: Date) { const copy = new Date(date); copy.setHours(0,0,0,0); return copy; }
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function monthLabel(date: Date) { return date.toLocaleDateString("en-GB",{month:"long",year:"numeric"}); }

function getPostType(post: DatabasePost): PostType {
  const t = (post.metadata?.public_type || post.type || "event").toLowerCase();
  return ["event","deal","alert","update","popup","advert"].includes(t) ? t as PostType : "event";
}
function getSelectedDates(post: DatabasePost) {
  const dates = post.metadata?.active_dates;
  if (Array.isArray(dates)) return dates.filter((d): d is string => typeof d === "string").sort();
  return [post.event_start,post.event_end].filter((d): d is string => typeof d === "string").filter((d,i,a)=>a.indexOf(d)===i).sort();
}
function getDealKind(metadata: PostMetadata | null): DealKind {
  const k=metadata?.deal_kind; return ["price","free","percent","multibuy"].includes(k || "") ? k as DealKind : "price";
}

export default function EditPostPage() {
  const params=useParams<{id:string}>(); const router=useRouter(); const postId=params.id;
  const [groupId,setGroupId]=useState(""); const [type,setType]=useState<PostType>("event");
  const [title,setTitle]=useState(""); const [body,setBody]=useState("");
  const [selectedDates,setSelectedDates]=useState<string[]>([]);
  const [monthDate,setMonthDate]=useState(()=>normaliseDate(new Date()));
  const [existingImageUrl,setExistingImageUrl]=useState<string|null>(null);
  const [removeExistingImage,setRemoveExistingImage]=useState(false);
  const [imageFile,setImageFile]=useState<File|null>(null); const [imagePreview,setImagePreview]=useState("");
  const [existingUpdateImages,setExistingUpdateImages]=useState<string[]>([]);
  const [updateImages,setUpdateImages]=useState<File[]>([]); const [updatePreviews,setUpdatePreviews]=useState<string[]>([]);
  const [popupAddress,setPopupAddress]=useState(""); const [popupStartTime,setPopupStartTime]=useState("09:00"); const [popupEndTime,setPopupEndTime]=useState("17:00");
  const [advertCta,setAdvertCta]=useState("BUY NOW"); const [advertUrl,setAdvertUrl]=useState("");
  const [dealKind,setDealKind]=useState<DealKind>("price"); const [dealPrice,setDealPrice]=useState("");
  const [discountPercent,setDiscountPercent]=useState(""); const [buyQuantity,setBuyQuantity]=useState(""); const [payQuantity,setPayQuantity]=useState("");
  const [originalMetadata,setOriginalMetadata]=useState<PostMetadata|null>(null);
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [deleting,setDeleting]=useState(false);
  const [message,setMessage]=useState(""); const [notFound,setNotFound]=useState(false);

  useEffect(()=>{ if(!imageFile){setImagePreview("");return;} const u=URL.createObjectURL(imageFile);setImagePreview(u);return()=>URL.revokeObjectURL(u);},[imageFile]);
  useEffect(()=>{const urls=updateImages.map(URL.createObjectURL);setUpdatePreviews(urls);return()=>urls.forEach(URL.revokeObjectURL);},[updateImages]);

  useEffect(()=>{ async function loadPost(){
    setLoading(true);
    try {
      const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser();
      if(!user){router.replace(`/log-in?next=/posts/${postId}/edit`);return;}
      const {data,error}=await supabase.from("posts").select("id,group_id,title,content,type,image_url,event_start,event_end,expires_at,metadata").eq("id",postId).maybeSingle();
      if(error) throw error; if(!data){setNotFound(true);return;}
      const post=data as DatabasePost;
      const {data:owned}=await supabase.from("groups").select("id").eq("id",post.group_id).eq("user_id",user.id).maybeSingle();
      if(!owned){setNotFound(true);return;}
      const loadedType=getPostType(post), dates=getSelectedDates(post);
      setGroupId(post.group_id);setType(loadedType);setTitle(post.title??"");setBody(post.content??"");
      setSelectedDates(loadedType==="event"||loadedType==="deal"?dates:[]);
      setExistingImageUrl(post.image_url);setOriginalMetadata(post.metadata);
      setExistingUpdateImages(Array.isArray(post.metadata?.image_urls)?post.metadata!.image_urls!.filter((x):x is string=>typeof x==="string"):[]);
      setPopupAddress(post.metadata?.popup_address??"");setPopupStartTime(post.metadata?.popup_start_time??"09:00");setPopupEndTime(post.metadata?.popup_end_time??"17:00");
      setAdvertCta(post.metadata?.advert_cta??"BUY NOW");setAdvertUrl(post.metadata?.advert_url??"");
      setDealKind(getDealKind(post.metadata));setDealPrice(post.metadata?.deal_price!=null?String(post.metadata.deal_price):"");
      setDiscountPercent(post.metadata?.discount_percent!=null?String(post.metadata.discount_percent):"");
      setBuyQuantity(post.metadata?.buy_quantity!=null?String(post.metadata.buy_quantity):"");setPayQuantity(post.metadata?.pay_quantity!=null?String(post.metadata.pay_quantity):"");
      if(dates[0]){const d=new Date(`${dates[0]}T12:00:00`);if(!Number.isNaN(d.getTime()))setMonthDate(normaliseDate(d));}
    } catch(e){setMessage(e instanceof Error?e.message:"We couldn't load this post.");} finally{setLoading(false);}
  } if(postId) void loadPost();},[postId,router]);

  const today=normaliseDate(new Date());
  const calendarDays=useMemo(()=>{const y=monthDate.getFullYear(),m=monthDate.getMonth(),first=new Date(y,m,1),startDay=(first.getDay()+6)%7,start=normaliseDate(new Date(first));start.setDate(first.getDate()-startDay);return Array.from({length:42},(_,i)=>{const d=normaliseDate(new Date(start));d.setDate(start.getDate()+i);return d;});},[monthDate]);
  const toggleDate=(d:Date)=>{const k=dateKey(d);setSelectedDates(c=>c.includes(k)?c.filter(x=>x!==k):[...c,k].sort());};
  const removeDate=(d:string)=>setSelectedDates(c=>c.filter(x=>x!==d));
  const goPreviousMonth=()=>{const d=new Date(monthDate);d.setMonth(d.getMonth()-1);setMonthDate(normaliseDate(d));};
  const goNextMonth=()=>{const d=new Date(monthDate);d.setMonth(d.getMonth()+1);setMonthDate(normaliseDate(d));};

  async function uploadFile(file:File){const supabase=createClient(),ext=file.name.split(".").pop()||"jpg",name=`${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from("post-images").upload(name,file);if(error)throw error;return supabase.storage.from("post-images").getPublicUrl(name).data.publicUrl;}
  async function uploadImage(){if(!imageFile)return removeExistingImage?null:existingImageUrl;return uploadFile(imageFile);}

  async function savePost(){
    setMessage("");
    if(type!=="advert"&&!title.trim()){setMessage("Add a title.");return;}
    if((type==="event"||type==="deal")&&selectedDates.length===0){setMessage("Select at least one date.");return;}
    if(type==="popup"&&(!popupAddress.trim()||!popupStartTime||!popupEndTime)){setMessage("Add the Pop-Up address, start time and end time.");return;}
    if(type==="advert"&&(!advertUrl.trim()||(!imageFile&&!existingImageUrl))){setMessage("Add a banner image and CTA link.");return;}
    if(type==="deal"&&dealKind==="price"&&!dealPrice.trim()){setMessage("Add the deal price.");return;}
    setSaving(true);
    try{
      const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return;
      const {data:owned}=await supabase.from("groups").select("id").eq("id",groupId).eq("user_id",user.id).maybeSingle();if(!owned)throw new Error("You do not have permission to edit this post.");
      const imageUrl=(type==="alert"||type==="update")?null:await uploadImage();
      const newUpdateUrls=type==="update"?await Promise.all(updateImages.slice(0,Math.max(0,3-existingUpdateImages.length)).map(uploadFile)):[];
      const updateUrls=type==="update"?[...existingUpdateImages,...newUpdateUrls].slice(0,3):[];
      const metadata:PostMetadata={...(originalMetadata??{}),
        active_dates:type==="event"||type==="deal"?selectedDates:type==="popup"?[dateKey(new Date())]:[],
        public_type:type,alert_icon:type==="alert"?"alert":null,
        deal_kind:type==="deal"?dealKind:null,deal_price:type==="deal"&&dealKind==="price"?Number(dealPrice):null,
        discount_percent:type==="deal"&&dealKind==="percent"?Number(discountPercent):null,
        buy_quantity:type==="deal"&&dealKind==="multibuy"?Number(buyQuantity):null,pay_quantity:type==="deal"&&dealKind==="multibuy"?Number(payQuantity):null,
        image_urls:updateUrls,popup_address:type==="popup"?popupAddress.trim():null,popup_start_time:type==="popup"?popupStartTime:null,popup_end_time:type==="popup"?popupEndTime:null,
        advert_cta:type==="advert"?advertCta:null,advert_url:type==="advert"?advertUrl.trim():null
      };
      let expires:string|null=null;
      if(type==="alert"||type==="update") expires=new Date(Date.now()+86400000).toISOString();
      if(type==="popup"){const e=new Date();const [h,m]=popupEndTime.split(":").map(Number);e.setHours(h,m,0,0);expires=e.toISOString();}
      const {data,error}=await supabase.from("posts").update({
        type,title:type==="advert"?"Advert":title.trim(),content:type==="advert"?"":body.trim(),image_url:imageUrl,
        event_start:type==="event"||type==="deal"?selectedDates[0]??null:type==="popup"?dateKey(new Date()):null,
        event_end:type==="event"||type==="deal"?selectedDates.at(-1)??null:type==="popup"?dateKey(new Date()):null,
        expires_at:expires,metadata
      }).eq("id",postId).eq("group_id",groupId).select("id").maybeSingle();
      if(error)throw error;if(!data)throw new Error("The post could not be updated.");
      router.push("/account");router.refresh();
    }catch(e){setMessage(e instanceof Error?e.message:"We couldn't update this post.");}finally{setSaving(false);}
  }

  async function deletePost(){if(deleting||!window.confirm(`Delete "${type==="advert"?"this advert":title||"this post"}"? This cannot be undone.`))return;setDeleting(true);
    try{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data:owned}=await supabase.from("groups").select("id").eq("id",groupId).eq("user_id",user.id).maybeSingle();if(!owned)throw new Error("You do not have permission to delete this post.");const {error}=await supabase.from("posts").delete().eq("id",postId).eq("group_id",groupId);if(error)throw error;router.push("/account");router.refresh();}catch(e){setMessage(e instanceof Error?e.message:"We couldn't delete this post.");}finally{setDeleting(false);}
  }

  const displayedImage=imagePreview||(!removeExistingImage?existingImageUrl:null);
  if(loading)return <><SiteHeader/><main className="flex min-h-[65vh] items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-emerald-700"/></main><Footer/></>;
  if(notFound)return <><SiteHeader/><main className="mx-auto min-h-[65vh] max-w-4xl px-5 py-20 text-center"><h1 className="text-4xl font-black">Post not found.</h1><Link href="/account" className="mt-8 inline-flex h-12 items-center rounded-2xl bg-black px-5 text-white">Back to account</Link></main><Footer/></>;

  const types=[{value:"event",label:"Event",icon:CalendarDays},{value:"deal",label:"Deal",icon:PoundSterling},{value:"alert",label:"Alert",icon:AlertTriangle},{value:"update",label:"Update",icon:Newspaper},{value:"popup",label:"Pop-Up",icon:MapPin},{value:"advert",label:"Advert",icon:Megaphone}] as const;

  return <><SiteHeader/><main className="bg-white text-black">
    <section className="border-b border-black/10"><div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16"><Link href="/account" className="inline-flex items-center gap-2 text-sm font-black text-black/55"><ArrowLeft className="h-4 w-4"/>Back to account</Link><p className="mt-10 text-sm font-black uppercase tracking-[.18em] text-emerald-700">Edit Post</p><h1 className="mt-4 text-5xl font-black">Make your changes.</h1></div></section>
    <div className="mx-auto max-w-3xl space-y-8 px-5 py-12 sm:px-8">
      <section><h2 className="text-xl font-black">Post type</h2><div className="mt-4 grid grid-cols-3 gap-3">{types.map(item=>{const Icon=item.icon;return <button key={item.value} type="button" onClick={()=>setType(item.value)} className={`flex min-h-28 flex-col items-center justify-center rounded-2xl border p-4 ${type===item.value?"border-emerald-700 bg-emerald-700 text-white":"border-black/10"}`}><Icon className="h-6 w-6"/><span className="mt-2 text-sm font-black">{item.label}</span></button>})}</div></section>

      {type!=="advert"&&<section className="border-t border-black/10 pt-8"><label className="block text-sm font-black">Title</label><input value={title} onChange={e=>setTitle(e.target.value)} className="mt-3 h-14 w-full rounded-2xl border border-black/15 px-5 font-semibold"/><label className="mt-6 block text-sm font-black">Details</label><textarea value={body} onChange={e=>setBody(e.target.value)} rows={7} className="mt-3 w-full rounded-2xl border border-black/15 px-5 py-4 font-semibold"/></section>}

      {type==="deal"&&<section className="border-t border-black/10 pt-8"><h2 className="text-xl font-black">Deal</h2><select value={dealKind} onChange={e=>setDealKind(e.target.value as DealKind)} className="mt-4 h-14 w-full rounded-2xl border px-5"><option value="price">Price deal</option><option value="free">Free</option><option value="percent">Percentage off</option><option value="multibuy">Multibuy</option></select>{dealKind==="price"&&<input value={dealPrice} onChange={e=>setDealPrice(e.target.value)} placeholder="5.00" className="mt-4 h-14 w-full rounded-2xl border px-5"/>}{dealKind==="percent"&&<input value={discountPercent} onChange={e=>setDiscountPercent(e.target.value)} placeholder="20" className="mt-4 h-14 w-full rounded-2xl border px-5"/>}{dealKind==="multibuy"&&<div className="mt-4 grid grid-cols-2 gap-4"><input value={buyQuantity} onChange={e=>setBuyQuantity(e.target.value)} placeholder="Buy 2" className="h-14 rounded-2xl border px-5"/><input value={payQuantity} onChange={e=>setPayQuantity(e.target.value)} placeholder="Pay 1" className="h-14 rounded-2xl border px-5"/></div>}</section>}

      {type==="popup"&&<section className="border-t border-black/10 pt-8"><h2 className="text-xl font-black">Pop-Up details</h2><input value={popupAddress} onChange={e=>setPopupAddress(e.target.value)} placeholder="Address" className="mt-4 h-14 w-full rounded-2xl border px-5"/><div className="mt-4 grid grid-cols-2 gap-4"><input type="time" step="3600" value={popupStartTime} onChange={e=>setPopupStartTime(e.target.value)} className="h-14 rounded-2xl border px-5"/><input type="time" step="3600" value={popupEndTime} onChange={e=>setPopupEndTime(e.target.value)} className="h-14 rounded-2xl border px-5"/></div></section>}

      {type==="advert"&&<section className="border-t border-black/10 pt-8"><h2 className="text-xl font-black">Advert action</h2><select value={advertCta} onChange={e=>setAdvertCta(e.target.value)} className="mt-4 h-14 w-full rounded-2xl border px-5"><option>BUY NOW</option><option>BOOK NOW</option><option>LEARN MORE</option><option>VIEW WEBSITE</option><option>GET TICKETS</option><option>ORDER NOW</option><option>CONTACT US</option></select><input type="url" value={advertUrl} onChange={e=>setAdvertUrl(e.target.value)} placeholder="https://..." className="mt-4 h-14 w-full rounded-2xl border px-5"/></section>}

      {(type==="event"||type==="deal")&&<section className="border-t border-black/10 pt-8"><h2 className="text-xl font-black">Dates</h2><div className="mt-5 rounded-3xl bg-black/[.035] p-5"><div className="flex items-center justify-between"><button onClick={goPreviousMonth}><ChevronLeft/></button><h3 className="font-black">{monthLabel(monthDate)}</h3><button onClick={goNextMonth}><ChevronRight/></button></div><div className="mt-5 grid grid-cols-7 gap-2">{calendarDays.map(d=>{const k=dateKey(d);return <button key={k} type="button" onClick={()=>toggleDate(d)} className={`aspect-square rounded-xl text-sm font-black ${selectedDates.includes(k)?"bg-emerald-700 text-white":"bg-white"}`}>{d.getDate()}</button>})}</div></div><div className="mt-4 flex flex-wrap gap-2">{selectedDates.map(d=><button key={d} onClick={()=>removeDate(d)} className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-black">{d} <X className="inline h-4 w-4"/></button>)}</div></section>}

      {type==="update"&&<section className="border-t border-black/10 pt-8"><h2 className="text-xl font-black">Images</h2><p className="mt-2 text-sm text-black/50">Up to 3 images.</p><div className="mt-4 space-y-3">{existingUpdateImages.map((url,i)=><div key={url} className="relative"><Image src={url} alt="" width={900} height={600} unoptimized className="h-auto w-full rounded-2xl"/><button onClick={()=>setExistingUpdateImages(c=>c.filter((_,x)=>x!==i))} className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white"><X className="h-4 w-4"/></button></div>)}</div>{existingUpdateImages.length+updateImages.length<3&&<label className="mt-4 flex min-h-28 cursor-pointer items-center justify-center rounded-2xl border border-dashed"><input type="file" multiple accept="image/*" className="hidden" onChange={e=>{const files=Array.from(e.target.files??[]);setUpdateImages(c=>[...c,...files].slice(0,3-existingUpdateImages.length));e.currentTarget.value="";}}/><ImagePlus/></label>}<div className="mt-3 grid grid-cols-3 gap-3">{updatePreviews.map((u,i)=><div key={u} className="relative aspect-square"><Image src={u} alt="" fill unoptimized className="rounded-xl object-cover"/><button onClick={()=>setUpdateImages(c=>c.filter((_,x)=>x!==i))} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"><X className="h-4 w-4"/></button></div>)}</div></section>}

      {(type==="event"||type==="deal"||type==="popup"||type==="advert")&&<section className="border-t border-black/10 pt-8"><h2 className="text-xl font-black">{type==="advert"?"Banner image":"Image"}</h2><label className={`relative mt-5 flex cursor-pointer items-center justify-center overflow-hidden border bg-black/[.03] ${type==="advert"?"aspect-[4/1]":"aspect-[16/10] rounded-3xl"}`}><input type="file" accept="image/*" className="hidden" onChange={e=>{setImageFile(e.target.files?.[0]??null);setRemoveExistingImage(false)}}/>{displayedImage?<Image src={displayedImage} alt="" fill unoptimized className="object-cover"/>:<ImagePlus className="h-8 w-8 text-black/40"/>}</label>{displayedImage&&<button onClick={()=>{setImageFile(null);setRemoveExistingImage(true)}} className="mt-4 inline-flex gap-2 text-red-700"><Trash2 className="h-4 w-4"/>Remove image</button>}</section>}

      {message&&<p className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold text-red-800">{message}</p>}
      <section className="flex gap-3 border-t border-black/10 pt-8"><button onClick={()=>void savePost()} disabled={saving||deleting} className="h-14 flex-1 rounded-2xl bg-emerald-700 font-black text-white">{saving?"Saving...":"Save changes"}</button><button onClick={()=>void deletePost()} disabled={saving||deleting} className="h-14 rounded-2xl border border-red-200 px-6 font-black text-red-700">{deleting?"Deleting...":"Delete post"}</button></section>
    </div>
  </main><Footer/></>;
}