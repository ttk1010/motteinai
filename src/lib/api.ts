import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Gender, Item, ItemTags, User, Want, WearLog, Weather } from "../shared/types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin", ...init });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = ((await res.json()) as { error?: string }).error ?? msg;
    } catch {}
    throw new ApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (n, e) => !(e instanceof ApiError && e.status === 401) && n < 2,
      refetchOnWindowFocus: false,
    },
  },
});

export const imageUrl = (key: string) => `/api/images/${key}`;

export function itemImage(item: Pick<Item, "cutoutKey" | "imageKey">) {
  return imageUrl(item.cutoutKey ?? item.imageKey);
}

/* ───────── 読み込み ───────── */

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await req<User>("/api/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useAuthConfig() {
  return useQuery({
    queryKey: ["auth-config"],
    queryFn: () => req<{ dev: boolean }>("/auth/config"),
    staleTime: Infinity,
  });
}

export function useItems() {
  return useQuery({
    queryKey: ["items"],
    queryFn: () => req<Item[]>("/api/items"),
    // 処理中のアイテムがある間だけ、裏の処理の完了を見に行く
    refetchInterval: (q) => (q.state.data?.some((i) => i.status === "processing") ? 1500 : false),
  });
}

export function useWeather() {
  return useQuery({
    queryKey: ["weather"],
    queryFn: () => req<Weather>("/api/weather"),
    staleTime: 30 * 60_000,
  });
}

export function useWears() {
  return useQuery({ queryKey: ["wears"], queryFn: () => req<WearLog[]>("/api/wears?days=30") });
}

export function useWants() {
  return useQuery({ queryKey: ["wants"], queryFn: () => req<Want[]>("/api/wants") });
}

/* ───────── 書き込み ───────── */

function form(image: Blob, color: string | null, tags?: ItemTags) {
  const fd = new FormData();
  fd.set("image", image, "photo.jpg");
  if (color) fd.set("color", color);
  if (tags) fd.set("tags", JSON.stringify(tags));
  return fd;
}

export async function uploadItem(image: Blob, color: string | null, tags?: ItemTags) {
  const item = await req<Item>("/api/items", { method: "POST", body: form(image, color, tags) });
  queryClient.setQueryData<Item[]>(["items"], (old) => [
    item,
    ...(old ?? []).filter((i) => i.id !== item.id),
  ]);
  return item;
}

export function analyzeImage(image: Blob, color: string | null) {
  return req<ItemTags>("/api/analyze", { method: "POST", body: form(image, color) });
}

export async function importUrl(url: string): Promise<Blob> {
  const res = await fetch("/api/import-url", json("POST", { url }));
  if (!res.ok) throw new ApiError(res.status, "import failed");
  return res.blob();
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { gender?: Gender; lat?: number; lon?: number; place?: string }) =>
      req("/api/me", json("PATCH", b)),
    onMutate: (b) => {
      qc.setQueryData<User | null>(["me"], (u) => (u ? { ...u, ...b } : u));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["weather"] });
    },
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...b }: Partial<Item> & { id: string }) =>
      req<Item>(`/api/items/${id}`, json("PATCH", b)),
    onMutate: ({ id, ...b }) => {
      qc.setQueryData<Item[]>(["items"], (old) => old?.map((i) => (i.id === id ? { ...i, ...b } : i)));
    },
    onSuccess: (item) => {
      qc.setQueryData<Item[]>(["items"], (old) => old?.map((i) => (i.id === item.id ? item : i)));
    },
  });
}

export function deleteItem(id: string) {
  return req(`/api/items/${id}`, { method: "DELETE" });
}

export function useWear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { itemIds: string[]; wornOn: string }) => req<WearLog>("/api/wears", json("POST", b)),
    onSuccess: (log) => {
      qc.setQueryData<WearLog[]>(["wears"], (old) => [log, ...(old ?? [])]);
      qc.setQueryData<Item[]>(["items"], (old) =>
        old?.map((i) =>
          log.itemIds.includes(i.id) ? { ...i, wearCount: i.wearCount + 1, lastWornAt: log.wornOn } : i,
        ),
      );
    },
  });
}

export function useUnwear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (log: WearLog) => req(`/api/wears/${log.id}`, { method: "DELETE" }),
    onSuccess: (_r, log) => {
      qc.setQueryData<WearLog[]>(["wears"], (old) => old?.filter((w) => w.id !== log.id));
      qc.setQueryData<Item[]>(["items"], (old) =>
        old?.map((i) => (log.itemIds.includes(i.id) ? { ...i, wearCount: Math.max(0, i.wearCount - 1) } : i)),
      );
    },
  });
}

export function useAddWant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      b:
        | { kind: "archetype"; tags: ItemTags; label: string }
        | { kind: "check"; image: Blob; tags: ItemTags },
    ) =>
      b.kind === "archetype"
        ? req<Want>("/api/wants", json("POST", { tags: b.tags, label: b.label }))
        : req<Want>("/api/wants", { method: "POST", body: form(b.image, null, b.tags) }),
    onSuccess: (w) => qc.setQueryData<Want[]>(["wants"], (old) => [w, ...(old ?? [])]),
  });
}

export function useRemoveWant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => req(`/api/wants/${id}`, { method: "DELETE" }),
    onMutate: (id) => qc.setQueryData<Want[]>(["wants"], (old) => old?.filter((w) => w.id !== id)),
  });
}

export async function logout() {
  await fetch("/auth/logout", { method: "POST" });
  queryClient.clear();
  location.href = "/";
}

export async function deleteAccount() {
  await req("/api/me", { method: "DELETE" });
  queryClient.clear();
  location.href = "/";
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
