"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function TripSharePage({ params }: { params: { id: string } }) {
  const [shareUrl, setShareUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/trips/${params.id}`;
    setShareUrl(url);
    const fetchQr = async () => {
      try {
        const res = await fetch(`/share?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const data = await res.json();
          setQrUrl(data.qrUrl as string);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchQr();
  }, [params.id]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    alert("URLをコピーしました");
  };

  return (
    <div className="p-4 flex flex-col items-center gap-4">
      <div className="w-full max-w-md flex gap-2">
        <input className="flex-1 border p-2 rounded" value={shareUrl} readOnly />
        <Button onClick={handleCopy}>コピー</Button>
      </div>
      {qrUrl && (
        <Image
          src={qrUrl}
          alt="QR code"
          width={192}
          height={192}
          className="h-48 w-48"
          unoptimized
        />
      )}
    </div>
  );
}
