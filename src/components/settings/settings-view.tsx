"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useCategoriesContext } from "@/contexts/categories-context";
import { PALETTE } from "@/hooks/use-categories";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SettingsView({ email, fullName: initialFullName }: { email: string; fullName: string }) {
  const router = useRouter();
  const { categories, addCategory, deleteCategory } = useCategoriesContext();

  const [fullName, setFullName] = useState(initialFullName);
  const [savingName, setSavingName] = useState(false);

  const [newCategory, setNewCategory] = useState("");
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [addingCategory, setAddingCategory] = useState(false);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user!.id);
    setSavingName(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setAddingCategory(true);
    try {
      await addCategory(newCategory.trim(), newColor);
      setNewCategory("");
      toast.success("Category added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add category");
    } finally {
      setAddingCategory(false);
    }
  }

  async function handleDeleteCategory(id: string, name: string) {
    try {
      await deleteCategory(id);
      toast.success(`Deleted "${name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete category");
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, categories, and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Profile</CardTitle>
          <CardDescription>{email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveName} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="fullName">Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <Button type="submit" disabled={savingName}>
              {savingName && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Appearance</CardTitle>
          <CardDescription>Switch between light and dark mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Categories</CardTitle>
          <CardDescription>
            Used to tag tasks and break down your time in Insights. Reference one with #name in quick-add.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                <span className="flex-1 truncate text-sm font-medium">{category.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteCategory(category.id, category.name)}
                  aria-label={`Delete ${category.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          <form onSubmit={handleAddCategory} className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name"
              />
              <Button type="submit" disabled={addingCategory || !newCategory.trim()}>
                {addingCategory ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  aria-label={`Choose color ${color}`}
                  className={cn(
                    "size-6 rounded-full ring-offset-2 ring-offset-background transition",
                    newColor === color && "ring-2 ring-foreground"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-destructive">Sign out</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
