import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogOut, Trash2, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [layouts, setLayouts] = useState<any[]>([]);
  const [defaultLayout, setDefaultLayout] = useState<string>("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdmin();
    loadData();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (data?.role !== "admin") {
      toast.error("Accès refusé");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setIsLoading(false);
  };

  const loadData = async () => {
    const { data: usersData } = await supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .order("created_at", { ascending: false });

    const { data: layoutsData } = await supabase
      .from("saved_layouts")
      .select("*")
      .order("display_order", { ascending: true });

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("default_layout")
        .eq("id", user.id)
        .single();
      
      setDefaultLayout(profile?.default_layout || "");
    }

    setUsers(usersData || []);
    setLayouts(layoutsData || []);
  };

  const createUser = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: { full_name: newUserName },
        },
      });

      if (error) throw error;
      
      if (data.user) {
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "user",
        });
      }

      toast.success("Utilisateur créé !");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteLayout = async (id: string) => {
    const { error } = await supabase
      .from("saved_layouts")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Layout supprimé");
      loadData();
    }
  };

  const updateLayoutOrder = async (id: string, newOrder: number) => {
    const { error } = await supabase
      .from("saved_layouts")
      .update({ display_order: newOrder })
      .eq("id", id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success("Ordre mis à jour");
      loadData();
    }
  };

  const setAsDefaultLayout = async (layoutId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ default_layout: layoutId })
      .eq("id", user.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success("Layout par défaut défini");
      setDefaultLayout(layoutId);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            🛡️ Admin Dashboard
          </h1>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Créer un utilisateur</CardTitle>
            <CardDescription>Ajouter un nouvel utilisateur à la plateforme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@exemple.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe</Label>
                <Input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button onClick={createUser} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Créer l'utilisateur
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{user.full_name || "Sans nom"}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="text-sm">
                    <span className={`px-2 py-1 rounded ${user.user_roles?.[0]?.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>
                      {user.user_roles?.[0]?.role || 'user'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gestion des Layouts</CardTitle>
            <CardDescription>Réorganiser et supprimer les layouts sauvegardés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {layouts.map((layout, index) => (
                <div key={layout.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Input
                    type="number"
                    value={layout.display_order}
                    onChange={(e) => updateLayoutOrder(layout.id, parseInt(e.target.value))}
                    className="w-20"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{layout.name}</p>
                    {defaultLayout === layout.id && (
                      <span className="text-xs text-primary">Par défaut</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAsDefaultLayout(layout.id)}
                    disabled={defaultLayout === layout.id}
                  >
                    Définir par défaut
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteLayout(layout.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
