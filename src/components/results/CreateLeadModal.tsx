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
    firstName: "",
    lastName: "",
    contactTitle: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    country: "",
    category: "",
    industry: "",
    linkedinUrl: "",
    googleMapsUrl: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      businessName: "",
      firstName: "",
      lastName: "",
      contactTitle: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      city: "",
      state: "",
      country: "",
      category: "",
      industry: "",
      linkedinUrl: "",
      googleMapsUrl: "",
    });
  };

  const handleSave = async () => {
    if (!form.businessName.trim() && !form.firstName.trim()) {
      toast.error("Ingresa al menos un nombre de negocio o nombre de contacto");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: {
            ...form,
            contactPerson: [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ") || null,
            contactTitle: form.contactTitle || undefined,
            state: form.state || undefined,
            country: form.country || undefined,
            industry: form.industry || undefined,
            linkedinUrl: form.linkedinUrl || undefined,
            googleMapsUrl: form.googleMapsUrl || undefined,
            source: "manual",
          },
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

        <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
          {/* Row 1: Business name */}
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

          {/* Row 2: Nombre + Apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs flex items-center gap-1">
                <User className="h-3 w-3" /> Nombre
              </Label>
              <Input
                placeholder="Nombre de contacto"
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs flex items-center gap-1">
                <User className="h-3 w-3" /> Apellido
              </Label>
              <Input
                placeholder="Apellido"
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* Row: Cargo */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs flex items-center gap-1">
              <User className="h-3 w-3" /> Cargo
            </Label>
            <Input
              placeholder="Director, Gerente, CEO..."
              value={form.contactTitle}
              onChange={(e) => updateField("contactTitle", e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          {/* Row 3: Email + Phone */}
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

          {/* Row 4: Website */}
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

          {/* Row 5: Address + City */}
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

          {/* Row: Estado + País */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Estado / Provincia
              </Label>
              <Input
                placeholder="Antioquia, CDMX..."
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" /> País
              </Label>
              <Input
                placeholder="Colombia, México..."
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* Row 6: Category */}
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

          {/* Row: Industria / Sector */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs flex items-center gap-1">
              <Tag className="h-3 w-3" /> Industria / Sector
            </Label>
            <Input
              placeholder="Tecnología, Salud, Educación..."
              value={form.industry}
              onChange={(e) => updateField("industry", e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          {/* Row: LinkedIn URL + Google Maps URL */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs flex items-center gap-1">
                <Globe className="h-3 w-3" /> LinkedIn URL
              </Label>
              <Input
                placeholder="https://linkedin.com/in/..."
                value={form.linkedinUrl}
                onChange={(e) => updateField("linkedinUrl", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-xs flex items-center gap-1">
                <Globe className="h-3 w-3" /> Google Maps URL
              </Label>
              <Input
                placeholder="https://maps.google.com/..."
                value={form.googleMapsUrl}
                onChange={(e) => updateField("googleMapsUrl", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
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
            disabled={saving || (!form.businessName.trim() && !form.firstName.trim())}
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
