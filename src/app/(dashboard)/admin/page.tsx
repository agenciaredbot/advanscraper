"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  UserCheck,
  Database,
  Search,
  Loader2,
  Shield,
  ShieldOff,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalLeads: number;
  totalSearches: number;
  totalCampaigns: number;
  leadsToday: number;
  searchesToday: number;
  newUsersToday: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  dailyLimit: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    leads: number;
    searches: number;
    campaigns: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    dailyLimit: 50,
    role: "user",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  // Check authorization
  useEffect(() => {
    fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((data) => {
        setAuthorized(data.role === "superadmin");
      })
      .catch(() => setAuthorized(false));
  }, []);

  // Fetch stats
  useEffect(() => {
    if (!authorized) return;
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [authorized]);

  // Fetch users
  const fetchUsers = useCallback(
    (page = 1, search = "") => {
      if (!authorized) return;
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search && { search }),
      });
      fetch(`/api/admin/users?${params}`)
        .then((r) => r.json())
        .then((data) => {
          setUsers(data.users);
          setPagination(data.pagination);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [authorized]
  );

  useEffect(() => {
    fetchUsers(1, searchQuery);
  }, [authorized, fetchUsers, searchQuery]);

  const openEditDialog = (user: AdminUser) => {
    setEditUser(user);
    setEditForm({
      name: user.name || "",
      dailyLimit: user.dailyLimit,
      role: user.role,
      isActive: user.isActive,
    });
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al guardar");
        return;
      }
      toast.success("Usuario actualizado");
      setEditUser(null);
      fetchUsers(pagination.page, searchQuery);
      // Refresh stats too
      fetch("/api/admin/stats")
        .then((r) => r.json())
        .then(setStats)
        .catch(() => {});
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  // Authorization check
  if (authorized === null) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <ShieldOff className="h-16 w-16 text-red-400" />
        <h1 className="text-2xl font-bold text-zinc-100">Acceso Denegado</h1>
        <p className="text-zinc-400">
          No tienes permisos de superadmin para acceder a esta sección.
        </p>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Usuarios",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Usuarios Activos",
      value: stats?.activeUsers ?? 0,
      icon: UserCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Total Leads",
      value: stats?.totalLeads ?? 0,
      icon: Database,
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20",
    },
    {
      label: "Búsquedas Hoy",
      value: stats?.searchesToday ?? 0,
      icon: Search,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-violet-400" />
          <h1 className="text-3xl font-bold text-zinc-100">
            Panel de Administración
          </h1>
        </div>
        <p className="mt-1 text-zinc-400">
          Gestiona usuarios y monitorea la plataforma
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className="border-zinc-800 bg-zinc-900/50"
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-zinc-100 mt-1">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border ${stat.bg}`}
                >
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users Table */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-zinc-100">Usuarios</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400">Usuario</TableHead>
                    <TableHead className="text-zinc-400">Rol</TableHead>
                    <TableHead className="text-zinc-400">Estado</TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Leads
                    </TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Búsquedas
                    </TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Límite
                    </TableHead>
                    <TableHead className="text-zinc-400">Registro</TableHead>
                    <TableHead className="text-zinc-400"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="border-zinc-800 hover:bg-zinc-800/50"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-zinc-100">
                            {user.name || "Sin nombre"}
                          </p>
                          <p className="text-xs text-zinc-500">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.role === "superadmin"
                              ? "bg-violet-500/20 text-violet-400 border-violet-500/30"
                              : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                          }
                        >
                          {user.role === "superadmin" ? "Superadmin" : "Usuario"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.isActive
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }
                        >
                          {user.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-zinc-300">
                        {user._count.leads}
                      </TableCell>
                      <TableCell className="text-right text-zinc-300">
                        {user._count.searches}
                      </TableCell>
                      <TableCell className="text-right text-zinc-300">
                        {user.dailyLimit}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-sm">
                        {new Date(user.createdAt).toLocaleDateString("es-CO")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          className="text-zinc-400 hover:text-zinc-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                  <p className="text-sm text-zinc-500">
                    {pagination.total} usuarios en total
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() =>
                        fetchUsers(pagination.page - 1, searchQuery)
                      }
                      className="border-zinc-700 text-zinc-400"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-zinc-400">
                      Página {pagination.page} de {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() =>
                        fetchUsers(pagination.page + 1, searchQuery)
                      }
                      className="border-zinc-700 text-zinc-400"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Nombre</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Límite Diario de Búsquedas</Label>
              <Input
                type="number"
                value={editForm.dailyLimit}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    dailyLimit: parseInt(e.target.value) || 0,
                  }))
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Rol</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) =>
                  setEditForm((f) => ({ ...f, role: value }))
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Cuenta Activa</Label>
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(checked) =>
                  setEditForm((f) => ({ ...f, isActive: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditUser(null)}
              className="border-zinc-700 text-zinc-400"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
