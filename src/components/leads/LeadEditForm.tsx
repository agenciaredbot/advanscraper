"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface Lead {
  id: string;
  source: string;
  businessName: string | null;
  contactPerson: string | null;
  contactTitle: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
  rating: number | null;
  reviewsCount: number | null;
  followers: number | null;
  isBusiness: boolean | null;
  bio: string | null;
  profileUrl: string | null;
  isSaved: boolean;
  savedAt: string | null;
  scrapedAt: string;
  tags?: Array<{ tag: { id: string; name: string; color: string } }>;
  notes?: Array<{
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }>;
  outreachLogs?: Array<{
    id: string;
    channel: string;
    action: string;
    messagePreview: string | null;
    status: string;
    sentAt: string;
  }>;
  listItems?: Array<{
    list: { id: string; name: string; color: string | null };
  }>;
}

interface LeadEditFormProps {
  lead: Lead;
  onSaved?: () => void;
}

export function LeadEditForm({ lead, onSaved }: LeadEditFormProps) {
  const [businessName, setBusinessName] = useState(lead.businessName || "");
  const [contactPerson, setContactPerson] = useState(
    lead.contactPerson || ""
  );
  const [contactTitle, setContactTitle] = useState(lead.contactTitle || "");
  const [email, setEmail] = useState(lead.email || "");
  const [phone, setPhone] = useState(lead.phone || "");
  const [website, setWebsite] = useState(lead.website || "");
  const [address, setAddress] = useState(lead.address || "");
  const [city, setCity] = useState(lead.city || "");
  const [country, setCountry] = useState(lead.country || "");
  const [category, setCategory] = useState(lead.category || "");
  const [bio, setBio] = useState(lead.bio || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName || null,
          contactPerson: contactPerson || null,
          contactTitle: contactTitle || null,
          email: email || null,
          phone: phone || null,
          website: website || null,
          address: address || null,
          city: city || null,
          country: country || null,
          category: category || null,
          bio: bio || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      toast.success("Cambios guardados");
      onSaved?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar cambios"
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClassName =
    "bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-emerald-500/20";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Business Name */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Nombre del negocio</Label>
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Nombre del negocio"
            className={inputClassName}
          />
        </div>

        {/* Contact Person */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Persona de contacto</Label>
          <Input
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="Nombre del contacto"
            className={inputClassName}
          />
        </div>

        {/* Contact Title */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Cargo</Label>
          <Input
            value={contactTitle}
            onChange={(e) => setContactTitle(e.target.value)}
            placeholder="CEO, Director, etc."
            className={inputClassName}
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            className={inputClassName}
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Telefono</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+34 600 000 000"
            className={inputClassName}
          />
        </div>

        {/* Website */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Website</Label>
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://ejemplo.com"
            className={inputClassName}
          />
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Direccion</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Calle, numero..."
            className={inputClassName}
          />
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Ciudad</Label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ciudad"
            className={inputClassName}
          />
        </div>

        {/* Country */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Pais</Label>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Pais"
            className={inputClassName}
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label className="text-zinc-400 text-xs">Categoria</Label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Restaurante, Agencia, etc."
            className={inputClassName}
          />
        </div>
      </div>

      {/* Bio — full width */}
      <div className="space-y-1.5">
        <Label className="text-zinc-400 text-xs">Bio / Descripcion</Label>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Descripcion del negocio o contacto..."
          className={`${inputClassName} min-h-[100px] resize-none`}
        />
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
