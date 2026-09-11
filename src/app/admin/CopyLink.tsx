"use client";

import { useState } from "react";

export function CopyLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/t/${token}`;

  function copy() {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      onClick={copy}
      className="rounded border border-neutral-300 px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-50"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
