"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Building2, Camera, KeyRound, Phone, UserCog, UserPlus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UserDTO } from "@/lib/types";
import { useCreatePartner, useCreateUser, usePartners, useUpdateUser, useUsers } from "../queries";

async function imageData(file?: File) {
  if (!file || file.size === 0) return undefined;
  if (file.size > 1_000_000) throw new Error("Profile image must be under 1 MB");
  const source = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => { const element = new Image(); element.onload = () => resolve(element); element.onerror = reject; element.src = source; });
  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not process profile image");
  const crop = Math.min(image.width, image.height);
  context.drawImage(image, (image.width - crop) / 2, (image.height - crop) / 2, crop, crop, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function UserPortrait({ user, large = false }: { user: Pick<UserDTO, "name" | "profileImage">; large?: boolean }) {
  return <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 font-display font-semibold text-emerald-800 ring-2 ring-emerald-200 ring-offset-2 ring-offset-background ${large ? "size-20 text-2xl" : "size-12 text-lg"}`}>
    {user.profileImage ? <img src={user.profileImage} alt="" className="size-full object-cover" /> : user.name[0]}
  </span>;
}

export function AdminView() {
  const { data: partners = [] } = usePartners();
  const { data: users = [] } = useUsers();
  const createPartner = useCreatePartner();
  const createUser = useCreateUser();
  const [role, setRole] = useState<"owner" | "partner">("owner");
  const [partnerId, setPartnerId] = useState("");
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);

  async function addPartner(form: FormData) {
    try { await createPartner.mutateAsync({ name: form.get("name"), contactNumber: form.get("contactNumber") }); toast.success("Partner added"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not add partner"); }
  }

  async function addUser(form: FormData) {
    try {
      await createUser.mutateAsync({ name: form.get("name"), username: form.get("username"), password: form.get("password"), role, partnerId: role === "partner" ? partnerId : null, profileImage: await imageData(form.get("image") as File) });
      toast.success("User account created");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not add user"); }
  }

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 p-6 text-white shadow-xl shadow-emerald-950/10">
      <div className="absolute -right-16 -top-24 size-64 rounded-full bg-emerald-300/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-semibold tracking-[0.18em] text-emerald-300 uppercase">Secure administration</p><h2 className="mt-2 font-display text-3xl font-semibold">People & access</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/70">Manage partner organizations, user identities, profile photos and account passwords from one protected workspace.</p></div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-[390px]">{[{ label: "Users", value: users.length }, { label: "Partners", value: partners.length }, { label: "Assigned", value: partners.reduce((sum, p) => sum + p.clientCount, 0) }].map((item) => <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur"><p className="font-display text-2xl font-semibold">{item.value}</p><p className="text-[11px] text-emerald-100/60">{item.label}</p></div>)}</div>
      </div>
    </section>

    <Tabs defaultValue="users" className="gap-4">
      <TabsList className="grid h-12 w-full max-w-md grid-cols-2 rounded-xl border bg-card p-1 shadow-sm"><TabsTrigger value="users" className="h-full rounded-lg"><UsersRound />Users</TabsTrigger><TabsTrigger value="partners" className="h-full rounded-lg"><Building2 />Partners</TabsTrigger></TabsList>

      <TabsContent value="users" className="space-y-5">
        <Card className="card-lux overflow-hidden py-0"><div className="border-b bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 dark:from-emerald-950/30 dark:to-teal-950/20"><h3 className="flex items-center gap-2 font-display text-lg font-semibold"><UserPlus className="size-5 text-emerald-600" />Create user account</h3><p className="mt-1 text-sm text-muted-foreground">The password remains active until a Super Admin resets it.</p></div><CardContent className="p-5"><form action={addUser} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1.5"><Label>Full name</Label><Input name="name" required /></div><div className="space-y-1.5"><Label>Username</Label><Input name="username" required autoCapitalize="none" /></div><div className="space-y-1.5"><Label>Password</Label><Input name="password" type="password" minLength={8} required /></div>
          <div className="space-y-1.5"><Label>Profile picture</Label><Input name="image" type="file" accept="image/*" /></div><div className="space-y-1.5"><Label>Role</Label><Select value={role} onValueChange={(v) => setRole(v as "owner" | "partner")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="owner">Owner</SelectItem><SelectItem value="partner">Partner</SelectItem></SelectContent></Select></div>
          {role === "partner" && <div className="space-y-1.5"><Label>Partner organization</Label><Select value={partnerId} onValueChange={setPartnerId}><SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger><SelectContent>{partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>}
          <div className="flex items-end md:col-span-2 xl:col-span-3"><Button className="min-w-44 gap-2" disabled={createUser.isPending}><UserPlus className="size-4" />Create user</Button></div>
        </form></CardContent></Card>

        <div><div className="mb-3 flex items-center justify-between"><div><h3 className="font-display text-lg font-semibold">User directory</h3><p className="text-sm text-muted-foreground">Select a user to change their photo or reset their password.</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">{users.length} accounts</span></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{users.map((user) => <button key={user.id} onClick={() => setEditingUser(user)} className="group flex items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/5"><UserPortrait user={user} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{user.name}</p><p className="truncate text-sm text-muted-foreground">@{user.username}</p><div className="mt-2 flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-700">{user.role.replace("_", " ")}</span>{user.partnerName && <span className="truncate text-[11px] text-muted-foreground">{user.partnerName}</span>}</div></div><UserCog className="size-4 text-muted-foreground group-hover:text-emerald-600" /></button>)}</div>
        </div>
      </TabsContent>

      <TabsContent value="partners" className="space-y-5">
        <Card className="card-lux overflow-hidden py-0"><div className="border-b bg-gradient-to-r from-teal-50 to-emerald-50 px-5 py-4 dark:from-teal-950/20 dark:to-emerald-950/30"><h3 className="flex items-center gap-2 font-display text-lg font-semibold"><Building2 className="size-5 text-teal-600" />Add partner organization</h3><p className="mt-1 text-sm text-muted-foreground">Partner photos belong to their user accounts, not the organization record.</p></div><CardContent className="p-5"><form action={addPartner} className="grid max-w-4xl gap-4 md:grid-cols-[1fr_1fr_auto]"><div className="space-y-1.5"><Label>Partner name</Label><Input name="name" required /></div><div className="space-y-1.5"><Label>Contact number</Label><Input name="contactNumber" type="tel" required placeholder="e.g. +60 12-345 6789" /></div><div className="flex items-end"><Button className="min-w-36" disabled={createPartner.isPending}>Add partner</Button></div></form></CardContent></Card>
        <div><div className="mb-3"><h3 className="font-display text-lg font-semibold">Partner directory</h3><p className="text-sm text-muted-foreground">Organizations that can be assigned to one or more clients.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{partners.length ? partners.map((partner) => <article key={partner.id} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between"><span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md"><Building2 className="size-5" /></span><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">Active</span></div><h4 className="mt-4 font-display text-lg font-semibold">{partner.name}</h4><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="size-3.5" />{partner.contactNumber}</p><div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4"><div><p className="text-xl font-semibold">{partner.clientCount}</p><p className="text-xs text-muted-foreground">Assigned clients</p></div><div><p className="text-xl font-semibold">{partner.userCount}</p><p className="text-xs text-muted-foreground">User accounts</p></div></div></article>) : <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">No partners added yet.</div>}</div></div>
      </TabsContent>
    </Tabs>
    <UserEditDialog user={editingUser} onClose={() => setEditingUser(null)} />
  </div>;
}

function UserEditDialog({ user, onClose }: { user: UserDTO | null; onClose: () => void }) {
  const updateUser = useUpdateUser();
  const { data: session, update: updateSession } = useSession();
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const shownPhoto = photo === undefined ? user?.profileImage : photo;

  async function save(form: FormData) {
    if (!user) return;
    try {
      const password = String(form.get("password") ?? "");
      const name = String(form.get("name") ?? "");
      const result = await updateUser.mutateAsync({ id: user.id, data: { name, profileImage: shownPhoto ?? null, ...(password ? { password } : {}) } }) as UserDTO;
      if (session?.user.id === user.id) await updateSession({});
      toast.success(password ? "Profile updated and password reset" : "Profile updated");
      setPhoto(undefined);
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not update user"); }
  }

  return <Dialog open={!!user} onOpenChange={(open) => { if (!open) { setPhoto(undefined); onClose(); } }}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle className="font-display text-xl">Manage user</DialogTitle><DialogDescription>Changes replace the current profile immediately. Leave the password blank to keep it unchanged.</DialogDescription></DialogHeader>{user && <form action={save} className="space-y-5"><div className="flex items-center gap-5 rounded-2xl border bg-muted/20 p-4"><UserPortrait user={{ name: user.name, profileImage: shownPhoto ?? null }} large /><div className="space-y-2"><Label htmlFor="replacementPhoto" className="flex items-center gap-2"><Camera className="size-4" />Replace profile picture</Label><Input id="replacementPhoto" type="file" accept="image/*" className="max-w-[270px]" onChange={async (event) => { try { const next = await imageData(event.target.files?.[0]); if (next) setPhoto(next); } catch (e) { toast.error(e instanceof Error ? e.message : "Invalid image"); } }} />{shownPhoto && <button type="button" onClick={() => setPhoto(null)} className="text-xs font-medium text-red-600 hover:underline">Remove current photo</button>}</div></div><div className="space-y-1.5"><Label htmlFor="editName">Full name</Label><Input id="editName" name="name" defaultValue={user.name} required /></div><div className="space-y-1.5"><Label htmlFor="resetPassword" className="flex items-center gap-2"><KeyRound className="size-4" />Reset password</Label><Input id="resetPassword" name="password" type="password" minLength={8} placeholder="Enter a new password only when resetting" /><p className="text-xs text-muted-foreground">The new password takes effect immediately after saving.</p></div><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button disabled={updateUser.isPending}>Save changes</Button></DialogFooter></form>}</DialogContent></Dialog>;
}
