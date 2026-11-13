"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopProduct } from "@/lib/shop/db";
import { confirmDialog } from "@/components/confirm-dialog";

type Product = ShopProduct & { image_url: string | null };

const KIND_LABEL: Record<ShopProduct["kind"], string> = {
  download: "Download — buyer downloads it straight away",
  post: "Posted — you post it (postage included in the price)",
  manual: "Emailed by you — you email it to the buyer",
};
const input = "w-full h-10 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum";
const label = "mb-1 block text-xs text-tal-plum-soft";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

const price = (cents: number) => (cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`);

export function ShopProductsAdmin({ initial }: { initial: Product[] }) {
  const [products, setProducts] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {products.map((p) =>
        editing === p.id ? (
          <ProductForm
            key={p.id}
            product={p}
            onSaved={(saved) => {
              setProducts((cur) => cur.map((x) => (x.id === saved.id ? saved : x)));
              setEditing(null);
            }}
            onDeleted={() => {
              setProducts((cur) => cur.filter((x) => x.id !== p.id));
              setEditing(null);
            }}
          />
        ) : (
          <button
            key={p.id}
            type="button"
            onClick={() => setEditing(p.id)}
            className="flex w-full items-center gap-4 rounded-2xl border border-tal-line bg-white p-3 text-left hover:bg-tal-cream-soft"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-tal-cream-soft">
              {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-tal-plum">{p.name}</p>
              <p className="text-xs text-tal-plum-soft">
                {price(p.price_cents)} · {KIND_LABEL[p.kind].split(" — ")[0]}
                {p.kind === "download" && !p.file_path && <span className="text-red-700"> · no file uploaded</span>}
              </p>
            </div>
            {!p.active && <span className="rounded-full bg-tal-cream px-2 py-0.5 text-xs text-tal-plum">Hidden</span>}
            <span className="text-sm text-tal-plum-soft">Edit</span>
          </button>
        )
      )}
      {editing === "new" ? (
        <ProductForm
          product={null}
          nextSortOrder={(products.at(-1)?.sort_order ?? 0) + 10}
          onSaved={(saved) => {
            setProducts((cur) => [...cur, saved]);
            setEditing(null);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="h-11 w-full rounded-2xl border border-dashed border-tal-line text-sm text-tal-plum hover:bg-white"
        >
          + Add a product
        </button>
      )}
    </div>
  );
}

async function upload(file: File, kind: "image" | "file"): Promise<string> {
  const res = await fetch("/api/admin/shop/upload-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, filename: file.name, contentType: file.type, sizeBytes: file.size }),
  });
  const body = (await res.json().catch(() => ({}))) as { path?: string; signedUrl?: string; message?: string };
  if (!res.ok || !body.path || !body.signedUrl) throw new Error(body.message ?? "Couldn't upload the file.");
  const put = await fetch(body.signedUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
  if (!put.ok) throw new Error("Couldn't upload the file.");
  return body.path;
}

function ProductForm({
  product,
  nextSortOrder = 0,
  onSaved,
  onDeleted,
}: {
  product: Product | null;
  nextSortOrder?: number;
  onSaved: (p: Product) => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    summary: product?.summary ?? "",
    description: product?.description ?? "",
    price: product ? (product.price_cents / 100).toFixed(2) : "",
    kind: product?.kind ?? "download",
    active: product?.active ?? true,
    sort_order: String(product?.sort_order ?? nextSortOrder),
  });
  const [image, setImage] = useState<{ path: string | null; url: string | null }>({
    path: product?.image_path ?? null,
    url: product?.image_url ?? null,
  });
  const [file, setFile] = useState<{ path: string | null; name: string | null }>({
    path: product?.file_path ?? null,
    name: product?.file_name ?? null,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((cur) => ({
      ...cur,
      [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value,
      // New products get a web address from their name.
      ...(k === "name" && !product ? { slug: slugify(e.target.value) } : {}),
    }));

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setBusy("Uploading photo…");
    setError(null);
    try {
      const path = await upload(picked, "image");
      setImage({ path, url: URL.createObjectURL(picked) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload the photo.");
    } finally {
      setBusy(null);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setBusy("Uploading file…");
    setError(null);
    try {
      setFile({ path: await upload(picked, "file"), name: picked.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload the file.");
    } finally {
      setBusy(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy("Saving…");
    setError(null);
    try {
      const res = await fetch(product ? `/api/admin/shop/products/${product.id}` : "/api/admin/shop/products", {
        method: product ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: f.name,
          slug: f.slug,
          summary: f.summary || null,
          description: f.description || null,
          price: Number(f.price.replace(/[$,\s]/g, "")) || 0,
          kind: f.kind,
          active: f.active,
          sort_order: Number(f.sort_order) || 0,
          image_path: image.path,
          file_path: f.kind !== "manual" ? file.path : null,
          file_name: f.kind !== "manual" ? file.name : null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { product?: ShopProduct; message?: string };
      if (!res.ok || !body.product) throw new Error(body.message ?? "Couldn't save.");
      onSaved({ ...body.product, image_url: image.url });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!product) return;
    const ok = await confirmDialog(
      `Delete "${product.name}"?\nPast orders are kept, but its download links will stop working. To stop selling it but keep links working, untick "For sale" instead.`
    );
    if (!ok) return;
    setBusy("Deleting…");
    const res = await fetch(`/api/admin/shop/products/${product.id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) onDeleted?.();
    else setError("Couldn't delete.");
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border-2 border-black bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <label className="block">
          <span className={label}>Name</span>
          <input required value={f.name} onChange={set("name")} className={input} />
        </label>
        <label className="block">
          <span className={label}>Price inc GST ($)</span>
          <input required inputMode="decimal" value={f.price} onChange={set("price")} className={input} placeholder="0 = free" />
        </label>
      </div>
      <label className="block">
        <span className={label}>How it&rsquo;s delivered</span>
        <select value={f.kind} onChange={set("kind")} className={input}>
          {(Object.keys(KIND_LABEL) as ShopProduct["kind"][]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className={label}>Photo</span>
          <div className="flex items-center gap-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-tal-cream-soft">
              {image.url && <img src={image.url} alt="" className="h-full w-full object-cover" />}
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onImage} className="text-sm" />
          </div>
        </div>
        {f.kind !== "manual" && (
          <div>
            <span className={label}>{f.kind === "post" ? "Included download (optional)" : "File the buyer downloads"}</span>
            <p className="mb-1 text-sm text-tal-plum">
              {file.name ?? <span className={f.kind === "download" ? "text-red-700" : "text-tal-plum-soft"}>No file</span>}
            </p>
            <input type="file" onChange={onFile} className="text-sm" />
          </div>
        )}
      </div>
      <label className="block">
        <span className={label}>Short summary (shown on the shop page)</span>
        <input value={f.summary} onChange={set("summary")} maxLength={400} className={input} />
      </label>
      <label className="block">
        <span className={label}>
          Description — leave a blank line between paragraphs; start a line with &ldquo;- &rdquo; for a bullet point
        </span>
        <textarea value={f.description} onChange={set("description")} rows={10} className={input + " h-auto py-2"} />
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <label className="block">
          <span className={label}>Web address</span>
          <div className="flex items-center gap-1 text-sm text-tal-plum-soft">
            <span className="shrink-0">/shop/</span>
            <input required value={f.slug} onChange={set("slug")} className={input} />
          </div>
        </label>
        <label className="block">
          <span className={label}>Order on page</span>
          <input inputMode="numeric" value={f.sort_order} onChange={set("sort_order")} className={input} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-tal-plum">
        <input type="checkbox" checked={f.active} onChange={set("active")} />
        For sale (untick to hide it from the shop)
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        {product ? (
          <button type="button" onClick={remove} disabled={!!busy} className="text-sm text-red-700 hover:underline disabled:opacity-60">
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {busy && <span className="text-sm text-tal-plum-soft">{busy}</span>}
          <button type="submit" disabled={!!busy} className="h-10 rounded-xl bg-black px-5 text-sm font-medium text-white disabled:opacity-60">
            Save
          </button>
        </div>
      </div>
    </form>
  );
}
