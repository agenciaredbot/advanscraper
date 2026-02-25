"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Key,
  Mail,
  Bot,
  Zap,
  Video,
  Phone,
  Settings,
  Save,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  QrCode,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileData {
  id: string;
  email: string;
  name: string;
  dailyLimit: number;
  hasBrevoKey: boolean;
  hasSendsparkKey: boolean;
  hasAnthropicKey: boolean;
  hasApifyToken: boolean;
  systemKeysAvailable?: boolean;
}

interface WhatsAppStatus {
  connected: boolean;
  qrCode?: string;
  phone?: string;
}

// ---------------------------------------------------------------------------
// API key configuration metadata
// ---------------------------------------------------------------------------

interface ApiKeyConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  fieldName: string;
  hasKeyField: keyof ProfileData;
}

const API_KEYS_CONFIG: ApiKeyConfig[] = [
  {
    id: "anthropic",
    label: "Anthropic API Key",
    description: "Para generacion de mensajes con IA",
    icon: <Bot className="h-4 w-4 text-violet-400" />,
    fieldName: "anthropicApiKey",
    hasKeyField: "hasAnthropicKey",
  },
  {
    id: "brevo",
    label: "Brevo API Key",
    description: "Para envio de emails masivos",
    icon: <Mail className="h-4 w-4 text-blue-400" />,
    fieldName: "brevoApiKey",
    hasKeyField: "hasBrevoKey",
  },
  {
    id: "apify",
    label: "Apify API Token",
    description: "Para scraping premium de Google Maps, LinkedIn, Instagram",
    icon: <Zap className="h-4 w-4 text-amber-400" />,
    fieldName: "apifyApiToken",
    hasKeyField: "hasApifyToken",
  },
  {
    id: "sendspark-key",
    label: "SendSpark API Key",
    description: "Para videos personalizados",
    icon: <Video className="h-4 w-4 text-rose-400" />,
    fieldName: "sendsparkApiKey",
    hasKeyField: "hasSendsparkKey",
  },
  {
    id: "sendspark-secret",
    label: "SendSpark API Secret",
    description: "Para autenticacion SendSpark",
    icon: <Key className="h-4 w-4 text-rose-400" />,
    fieldName: "sendsparkApiSecret",
    hasKeyField: "hasSendsparkKey",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  // ----- Profile state -----
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [name, setName] = useState("");
  const [dailyLimit, setDailyLimit] = useState<number>(50);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);

  // ----- API keys state -----
  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({});
  const [apiKeyVisible, setApiKeyVisible] = useState<Record<string, boolean>>(
    {}
  );
  const [savingKeys, setSavingKeys] = useState(false);

  // ----- WhatsApp state -----
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);
  const [loadingWa, setLoadingWa] = useState(true);
  const [connectingWa, setConnectingWa] = useState(false);
  const [waitingForScan, setWaitingForScan] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // =========================================================================
  // Fetch profile
  // =========================================================================

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/profile");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.debug || `HTTP ${res.status}`);
      }
      const data: ProfileData = await res.json();
      setProfile(data);
      setName(data.name ?? "");
      setDailyLimit(data.dailyLimit ?? 50);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error(`No se pudo cargar el perfil: ${msg}`);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // =========================================================================
  // Fetch WhatsApp status
  // =========================================================================

  const fetchWaStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (!res.ok) throw new Error("Error al obtener estado de WhatsApp");
      const data: WhatsAppStatus = await res.json();
      setWaStatus(data);

      // If connected while polling, stop polling
      if (data.connected && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setWaitingForScan(false);
        toast.success("WhatsApp conectado correctamente");
      }
    } catch {
      // Silently fail during polling
    } finally {
      setLoadingWa(false);
    }
  }, []);

  // =========================================================================
  // Effects
  // =========================================================================

  useEffect(() => {
    fetchProfile();
    fetchWaStatus();
  }, [fetchProfile, fetchWaStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  // =========================================================================
  // Handlers
  // =========================================================================

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const data = await res.json();
      if (data.success) {
        setProfile((prev) => (prev ? { ...prev, name: data.name } : prev));
        toast.success("Perfil actualizado");
      }
    } catch {
      toast.error("Error al guardar el perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveApiKeys = async () => {
    // Build payload with only filled keys
    const payload: Record<string, string> = {};
    for (const cfg of API_KEYS_CONFIG) {
      const val = apiKeyValues[cfg.id]?.trim();
      if (val) {
        payload[cfg.fieldName] = val;
      }
    }

    if (Object.keys(payload).length === 0) {
      toast.warning("No hay API keys para guardar");
      return;
    }

    setSavingKeys(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const data = await res.json();
      if (data.success) {
        // Update profile flags
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                hasBrevoKey: data.hasBrevoKey,
                hasSendsparkKey: data.hasSendsparkKey,
                hasAnthropicKey: data.hasAnthropicKey,
                hasApifyToken: data.hasApifyToken,
              }
            : prev
        );
        // Clear entered values
        setApiKeyValues({});
        toast.success("API keys guardadas correctamente");
      }
    } catch {
      toast.error("Error al guardar las API keys");
    } finally {
      setSavingKeys(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSavingGeneral(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyLimit }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const data = await res.json();
      if (data.success) {
        toast.success("Configuracion actualizada");
      }
    } catch {
      toast.error("Error al guardar la configuracion");
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleConnectWhatsApp = async () => {
    setConnectingWa(true);
    try {
      const res = await fetch("/api/whatsapp/init", { method: "POST" });
      if (!res.ok) throw new Error("Error al iniciar WhatsApp");
      const data = await res.json();

      if (data.success && data.qrCode) {
        setWaStatus((prev) => ({
          connected: false,
          qrCode: data.qrCode,
          phone: prev?.phone,
        }));
        setWaitingForScan(true);

        // Start polling every 3 seconds
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(fetchWaStatus, 3000);
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch {
      toast.error("Error al conectar WhatsApp");
    } finally {
      setConnectingWa(false);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setApiKeyVisible((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const updateApiKeyValue = (keyId: string, value: string) => {
    setApiKeyValues((prev) => ({ ...prev, [keyId]: value }));
  };

  // =========================================================================
  // Loading skeleton
  // =========================================================================

  if (loadingProfile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Configuracion</h1>
          <p className="mt-1 text-zinc-400">
            Configura API keys, perfil y preferencias
          </p>
        </div>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
          <Settings className="h-8 w-8 text-emerald-400" />
          Configuracion
        </h1>
        <p className="mt-1 text-zinc-400">
          Configura API keys, perfil y preferencias
        </p>
      </div>

      {/* ================================================================= */}
      {/* 1. Perfil */}
      {/* ================================================================= */}

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-zinc-100">Perfil</CardTitle>
          <CardDescription className="text-zinc-400">
            Informacion basica de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-zinc-300">Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label className="text-zinc-300">Email</Label>
              <div className="flex h-9 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/50 px-3">
                <Mail className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-400 truncate">
                  {profile?.email ?? "---"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {savingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-zinc-800" />

      {/* ================================================================= */}
      {/* 2. API Keys */}
      {/* ================================================================= */}

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <Key className="h-5 w-5 text-emerald-400" />
            API Keys
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {profile?.systemKeysAvailable
              ? "Las APIs del sistema ya están configuradas por el administrador. Puedes usar las tuyas propias si lo prefieres."
              : "Configura las credenciales de los servicios externos"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {API_KEYS_CONFIG.map((cfg) => {
            const isConfigured = profile
              ? Boolean(profile[cfg.hasKeyField])
              : false;
            const isVisible = apiKeyVisible[cfg.id] ?? false;
            const value = apiKeyValues[cfg.id] ?? "";

            return (
              <div
                key={cfg.id}
                className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {cfg.icon}
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {cfg.label}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {cfg.description}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={
                      isConfigured
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }
                  >
                    {isConfigured ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Configurada
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        No configurada
                      </>
                    )}
                  </Badge>
                </div>

                {/* Input row */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={isVisible ? "text" : "password"}
                      value={value}
                      onChange={(e) => updateApiKeyValue(cfg.id, e.target.value)}
                      placeholder={
                        isConfigured
                          ? "••••••••••••••••"
                          : "Ingresa tu API key"
                      }
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility(cfg.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {isVisible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end">
            <Button
              onClick={handleSaveApiKeys}
              disabled={savingKeys}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {savingKeys ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar API Keys
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-zinc-800" />

      {/* ================================================================= */}
      {/* 3. WhatsApp */}
      {/* ================================================================= */}

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <Phone className="h-5 w-5 text-emerald-400" />
            WhatsApp
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Conecta tu cuenta de WhatsApp para enviar mensajes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingWa ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : (
            <>
              {/* Status indicator */}
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  {waStatus?.connected && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex h-3 w-3 rounded-full ${
                      waStatus?.connected ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                </span>
                <span
                  className={`text-sm font-medium ${
                    waStatus?.connected ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {waStatus?.connected ? "Conectado" : "Desconectado"}
                </span>
              </div>

              {/* Connected: show phone number */}
              {waStatus?.connected && waStatus.phone && (
                <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                  <Phone className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm text-zinc-300">{waStatus.phone}</span>
                </div>
              )}

              {/* Disconnected: connect button or QR code */}
              {!waStatus?.connected && (
                <>
                  {waitingForScan && waStatus?.qrCode ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <QrCode className="h-4 w-4" />
                        Escanea el codigo QR con tu telefono
                      </div>
                      <div className="flex justify-center rounded-lg border border-zinc-800 bg-white p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={waStatus.qrCode}
                          alt="WhatsApp QR Code"
                          className="h-64 w-64"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Esperando escaneo...
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={handleConnectWhatsApp}
                      disabled={connectingWa}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {connectingWa ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Phone className="h-4 w-4" />
                      )}
                      Conectar WhatsApp
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Separator className="bg-zinc-800" />

      {/* ================================================================= */}
      {/* 4. Configuracion General */}
      {/* ================================================================= */}

      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-400" />
            Configuracion General
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Ajustes generales de la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm space-y-2">
            <Label className="text-zinc-300">
              Limite diario de scraping
            </Label>
            <Input
              type="number"
              min={1}
              max={10000}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
            <p className="text-xs text-zinc-500">
              Numero maximo de leads que puedes scrapear por dia
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveGeneral}
              disabled={savingGeneral}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {savingGeneral ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
