import { useState } from "react";
import { Save, FolderOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LayoutManagerProps {
  savedLayouts: any[];
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
}

const LayoutManager = ({ savedLayouts, onSave, onLoad, onDelete }: LayoutManagerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [layoutName, setLayoutName] = useState("");

  const handleSave = () => {
    if (layoutName.trim()) {
      onSave(layoutName.trim());
      setLayoutName("");
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="flex gap-2">
      {/* Save button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs">
            <Save className="w-3 h-3 mr-1" />
            Save Layout
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current Layout</DialogTitle>
            <DialogDescription>
              Give this layout a name to save it for later use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="layout-name">Layout Name</Label>
              <Input
                id="layout-name"
                placeholder="e.g., My Custom Layout"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!layoutName.trim()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs">
            <FolderOpen className="w-3 h-3 mr-1" />
            Load Layout
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {savedLayouts.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              No saved layouts
            </div>
          ) : (
            savedLayouts.map((layout) => (
              <div key={layout.name} className="flex items-center justify-between">
                <DropdownMenuItem
                  onClick={() => onLoad(layout.name)}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{layout.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(layout.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </DropdownMenuItem>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(layout.name);
                  }}
                  className="h-8 w-8 p-0 hover:bg-destructive/10"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default LayoutManager;
