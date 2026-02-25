"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Building2, User, Mail, Phone, Globe, MapPin, Tag } from "lucide-react";
import { toast } from "sonner";

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateLeadModal({ open, onOpenChange, onCreated }: CreateLeadModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    contactPerson: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    category: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      businessName: "",
      contactPerson: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      city: "",
      category: "",
    });
  };

  const handleSave = async () => {
    if (!form.businessName.trim() && !form.contactPerson.trim()) {
      toast.error("Ingresa al menos un nombre de negocio o persona de contacto");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: { ...form, source: "manual" },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al guardar");
      }

      toast.success("Lead creado exitosamente");
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Agregar Lead Manual</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Completa los datos del contacto o negocio
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Row 1: Business name + Contact person */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Negocio
              </Label>
              <Input
                placeholder="Nombre del negocio"
                value={form.businessName}
                onChange={(e) => updateField("businessName", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs flex items-center gap-1">
                <User className="h-3 w-3" /> Contacto
              </Label>
              <Input
                placeholder="Persona de contacto"
                value={form.contactPerson}
                onChange={(e) => updateField("contactPerson", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* Row 2: Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </Label>
              <Input
                type="email"
                placeholder="email@ejemplo.com"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs flex items-center gap-1">
                <Phone className="h-3 w-3" /> Teléfono
              </Label>
              <Input
                type="tel"
                placeholder="+57 300 000 0000"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* Row 3: Website */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs flex items-center gap-1">
              <Globe className="h-3 w-3" /> Website
            </Label>
            <Input
              placeholder="https://ejemplo.com"
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          {/* Row 4: Address + City */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Dirección
              </Label>
              <Input
                placeholder="Calle, número..."
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Ciudad
              </Label>
              <Input
                placeholder="Bogotá, Medellín..."
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* Row 5: Category */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs flex items-center gap-1">
              <Tag className="h-3 w-3" /> Categoría
            </Label>
            <Input
              placeholder="Restaurante, Dentista, Abogado..."
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700 text-zinc-400"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (!form.businessName.trim() && !form.contactPerson.trim())}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
