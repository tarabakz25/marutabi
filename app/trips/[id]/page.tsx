import Link from 'next/link';
export const dynamic = 'force-dynamic';
import { requireUser } from '@/lib/auth';
import { getTripById } from '@/lib/trips';
import { Suspense } from 'react';

type Params = { params: { id: string } };

export default async function TripDetailPage({ params }: Params) {
  const { id } = params;
  let trip: any = null;
  try {
    const { userId } = await requireUser();
    trip = await getTripById(id, userId);
  } catch {}
  if (!trip) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="max-w-5xl">
          <div className="rounded-lg border p-6 bg-white">見つかりませんでした</div>
        </div>
      </main>
    );
  }
  const selection = trip.selection ?? {};
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{trip.title}</h1>
          <Link href="/trips" className="text-sm text-slate-600 underline">一覧に戻る</Link>
        </div>
        <div className="rounded-lg border p-6 bg-white space-y-3">
          <div className="text-sm text-slate-600">更新: {new Date(trip.updatedAt).toLocaleString('ja-JP')}</div>
          <div className="text-sm">出発: {selection.origin?.name ?? '—'}</div>
          <div className="text-sm">到着: {selection.destination?.name ?? '—'}</div>
          {Array.isArray(selection.vias) && selection.vias.length > 0 && (
            <div className="text-sm">経由: {selection.vias.map((v: any) => v.name).join(' / ')}</div>
          )}
        </div>
        <Suspense>
          <LikeAndComment tripId={trip.id} />
        </Suspense>
        <RatingForm id={trip.id} />
      </div>
    </main>
  );
}

function RatingForm({ id }: { id: string }) {
  return (
    <form action={`/api/ratings`} method="POST" className="rounded-lg border p-6 bg-white space-y-3">
      <div className="text-base font-semibold">旅の評価を投稿</div>
      <input type="hidden" name="tripId" value={id} />
      {/* 星入力（簡易）*/}
      <div className="flex items-center gap-2 text-sm">
        <label className="w-24">星</label>
        <select name="stars" className="border rounded px-2 py-1">
          <option value="5">★★★★★</option>
          <option value="4">★★★★☆</option>
          <option value="3">★★★☆☆</option>
          <option value="2">★★☆☆☆</option>
          <option value="1">★☆☆☆☆</option>
        </select>
      </div>
      <div className="flex items-start gap-2 text-sm">
        <label className="w-24">コメント</label>
        <textarea name="comment" rows={3} className="flex-1 border rounded px-2 py-1" placeholder="旅の感想など"></textarea>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <label className="w-24">公開設定</label>
        <select name="isPublic" className="border rounded px-2 py-1">
          <option value="true">公開（ブログに表示）</option>
          <option value="false">非公開（自分だけ）</option>
        </select>
      </div>
      <div className="pt-2">
        <button formAction="/trips/[id]" className="hidden" />
        {/* POST via fetch in client would be better; keep simple server action style via route handler */}
        <SubmitViaFetch />
      </div>
    </form>
  );
}

function LikeAndComment({ tripId }: { tripId: string }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
      (function(){
        var root = document.currentScript.parentElement;
        var wrap = document.createElement('div');
        wrap.className = 'rounded-lg border p-6 bg-white space-y-4';
        var likeRow = document.createElement('div');
        likeRow.className = 'flex items-center gap-3';
        var likeBtn = document.createElement('button');
        likeBtn.type = 'button';
        likeBtn.className = 'px-3 py-2 rounded-md border text-sm hover:bg-slate-50';
        likeBtn.textContent = 'いいね';
        var likeInfo = document.createElement('span');
        likeInfo.className = 'text-sm text-slate-600';
        likeRow.appendChild(likeBtn);
        likeRow.appendChild(likeInfo);
        wrap.appendChild(likeRow);

        var commentForm = document.createElement('div');
        commentForm.className = 'space-y-2';
        var ta = document.createElement('textarea');
        ta.rows = 3; ta.className = 'w-full border rounded px-2 py-1 text-sm';
        ta.placeholder = 'コメントを書く';
        var postBtn = document.createElement('button');
        postBtn.type = 'button';
        postBtn.className = 'inline-flex items-center px-3 py-2 rounded-md bg-slate-900 text-white text-sm';
        postBtn.textContent = 'コメントを投稿';
        var err = document.createElement('div');
        err.className = 'text-xs text-red-600';
        commentForm.appendChild(ta);
        commentForm.appendChild(postBtn);
        commentForm.appendChild(err);
        wrap.appendChild(commentForm);

        var list = document.createElement('div');
        list.className = 'divide-y';
        wrap.appendChild(list);

        async function refreshLikes(){
          try{ const res = await fetch('/api/likes?tripId=' + encodeURIComponent('${tripId}')); if(!res.ok) return; const j = await res.json(); likeInfo.textContent = '合計 ' + (j.total||0) + ' 件'; if(j.likedByMe) { likeBtn.textContent = 'いいね済み'; likeBtn.className = 'px-3 py-2 rounded-md border text-sm bg-slate-900 text-white'; } else { likeBtn.textContent = 'いいね'; likeBtn.className = 'px-3 py-2 rounded-md border text-sm hover:bg-slate-50'; } }catch{}
        }
        async function toggle(){
          try{ const res = await fetch('/api/likes', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ tripId: '${tripId}' }) }); if(!res.ok){ const e = await res.json().catch(function(){return {}}); alert(e.error||'失敗しました'); return; } await refreshLikes(); }catch{}
        }
        async function refreshComments(){
          try{ const res = await fetch('/api/comments?tripId=' + encodeURIComponent('${tripId}')); if(!res.ok) return; const j = await res.json(); list.innerHTML=''; (j.comments||[]).forEach(function(c){ var item = document.createElement('div'); item.className='py-3'; var body=document.createElement('div'); body.className='text-sm'; body.textContent=c.body; var meta=document.createElement('div'); meta.className='text-xs text-slate-500'; meta.textContent=new Date(c.createdAt).toLocaleString('ja-JP'); item.appendChild(body); item.appendChild(meta); list.appendChild(item); }); }catch{}
        }
        async function post(){
          var v = (ta.value||'').trim();
          if(!v){ err.textContent='コメントを入力してください'; return; }
          err.textContent='';
          try{ const res = await fetch('/api/comments', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ tripId: '${tripId}', body: v }) }); if(!res.ok){ const e = await res.json().catch(function(){return {}}); err.textContent = e.error || '投稿に失敗しました'; return; } ta.value=''; await refreshComments(); }catch{ err.textContent='投稿に失敗しました'; }
        }

        likeBtn.addEventListener('click', toggle);
        postBtn.addEventListener('click', post);
        root.appendChild(wrap);
        refreshLikes();
        refreshComments();
      })();
    `,
      }}
    />
  );
}

function SubmitViaFetch() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
      (function(){
        var form = document.currentScript.parentElement.parentElement;
        if(!form) return;
        form.addEventListener('submit', function(ev){ ev.preventDefault(); });
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '投稿する';
        btn.className = 'inline-flex items-center px-3 py-2 rounded-md bg-slate-900 text-white text-sm';
        btn.addEventListener('click', async function(){
          var fd = new FormData(form);
          var body = JSON.stringify({
            tripId: fd.get('tripId'),
            stars: Number(fd.get('stars')||0),
            comment: String(fd.get('comment')||''),
            isPublic: String(fd.get('isPublic')) === 'true'
          });
          try{
            var res = await fetch('/api/ratings', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
            if(!res.ok){
              var e = await res.json().catch(function(){return {}});
              alert(e.error || '投稿に失敗しました');
              return;
            }
            alert('投稿しました');
            location.reload();
          }catch(e){
            alert('投稿に失敗しました');
          }
        });
        form.querySelector('.pt-2').appendChild(btn);
      })();
    `,
      }}
    />
  );
}


