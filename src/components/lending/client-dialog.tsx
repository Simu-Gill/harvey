"use client";

// Create / edit client dialog.

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useApp } from "./store";
import { useClientDetail, useCreateClient, usePartners, useUpdateClient } from "./queries";

const schema = z.object({
  name: z.string().min(1, "Client name is required"),
  phone: z.string().optional(),
  occupation: z.string().optional(),
  idNumber: z.string().optional(),
  address: z.string().optional(),
  partnerIds: z.array(z.string()),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ClientDialog() {
  const clientDialogId = useApp((s) => s.clientDialogId);
  const closeClientDialog = useApp((s) => s.closeClientDialog);
  const editing = clientDialogId != null;

  // when editing, prefill from the client detail
  const { data } = useClientDetail(editing ? clientDialogId : null);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const { data: partners = [] } = usePartners();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      occupation: "",
      idNumber: "",
      address: "",
      partnerIds: [],
      notes: "",
    },
  });
  const selectedPartnerIds = useWatch({ control: form.control, name: "partnerIds" });

  useEffect(() => {
    if (clientDialogId != null && data?.client) {
      const c = data.client;
      form.reset({
        name: c.name,
        phone: c.phone ?? "",
        occupation: c.occupation ?? "",
        idNumber: c.idNumber ?? "",
        address: c.address ?? "",
        partnerIds: c.partners.map((partner) => partner.id),
        notes: c.notes ?? "",
      });
    }
  }, [clientDialogId, data, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === "string" ? (v.trim() || null) : v]));
    try {
      if (editing && clientDialogId) {
        await updateClient.mutateAsync({ id: clientDialogId, data: payload });
        toast.success(`${values.name} updated`);
      } else {
        await createClient.mutateAsync(payload);
        toast.success(`${values.name} added to the registry`);
      }
      closeClientDialog();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <Dialog
      open={clientDialogId !== undefined}
      onOpenChange={(o) => !o && closeClientDialog()}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {editing ? "Edit Client" : "New Client"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the borrower's record."
              : "Register a borrower — loans can only be attached afterwards."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={form.formState.errors.name?.message}>
              <Input placeholder="e.g. Samuel Osei" {...form.register("name")} />
            </Field>
            <Field label="Phone">
              <Input placeholder="+1 (555) 000-0000" {...form.register("phone")} />
            </Field>
            <Field label="Occupation">
              <Input placeholder="e.g. Market trader" {...form.register("occupation")} />
            </Field>
            <Field label="ID number">
              <Input placeholder="National ID / passport" {...form.register("idNumber")} />
            </Field>
            <Field label="Address">
              <Input placeholder="Street, area" {...form.register("address")} />
            </Field>
            <Field label="Client ownership">
              <div className="min-h-9 rounded-md border bg-background px-3 py-2">
                {partners.length === 0 ? (
                  <p className="text-sm text-muted-foreground">In-house Client</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">No selection means In-house Client</p>
                    {partners.map((partner) => {
                      const selected = selectedPartnerIds.includes(partner.id);
                      return <label key={partner.id} className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={selected} onCheckedChange={(checked) => { const current = form.getValues("partnerIds"); form.setValue("partnerIds", checked ? [...current, partner.id] : current.filter((id) => id !== partner.id), { shouldDirty: true }); }} />{partner.name}</label>;
                    })}
                  </div>
                )}
              </div>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={2} placeholder="Anything worth remembering…" {...form.register("notes")} />
          </Field>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeClientDialog}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting} className="gap-1.5">
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  required,
  error,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px] text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
